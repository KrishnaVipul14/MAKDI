const natural = require('natural');
const fs = require('fs');
const path = require('path');
const { creativelyRewordBullet } = require('./ollamaClient');

const synonyms = JSON.parse(fs.readFileSync(path.join(__dirname, '../synonyms.json'), 'utf-8'));
const skillsList = JSON.parse(fs.readFileSync(path.join(__dirname, '../skills.json'), 'utf-8'));
const TfIdf = natural.TfIdf;
const tokenizer = new natural.WordTokenizer();

// ─── Utility ─────────────────────────────────────────────────────────────────
function setByPath(obj, pathStr, value) {
  const keys = pathStr.replace(/\[(\d+)\]/g, '.$1').split('.');
  let curr = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    curr = curr[keys[i]];
  }
  curr[keys[keys.length - 1]] = value;
}

// ─── Keyword Extraction ─────────────────────────────────────────────────────
function extractJDKeywords(jdText) {
  const lower = jdText.toLowerCase();
  const found = skillsList.filter(skill => lower.includes(skill.toLowerCase()));
  const techPhrases = lower.match(/\b(?:machine learning|deep learning|data science|product management|project management|ui\/ux|rest api|node\.js|react\.js|next\.js|vue\.js|angular|spring boot|django|ruby on rails|ci\/cd|azure|google cloud|natural language processing)\b/g) || [];
  return [...new Set([...found, ...techPhrases])].filter(k => k.length > 1);
}

// ─── Keyword Match ──────────────────────────────────────────────────────────
function findKeywordMatch(jdKeyword, resumeText) {
  const lowerResume = resumeText.toLowerCase();
  const lowerKeyword = jdKeyword.toLowerCase();

  if (lowerResume.includes(lowerKeyword)) return { present: true, exact: true };

  const manualSyns = synonyms[lowerKeyword] || [];
  for (const syn of manualSyns) {
    if (lowerResume.includes(syn)) return { present: true, exact: false, foundAs: syn };
  }

  for (const [key, syns] of Object.entries(synonyms)) {
    if (syns.includes(lowerKeyword) && lowerResume.includes(key)) {
      return { present: true, exact: false, foundAs: key };
    }
  }

  return { present: false };
}

// ─── ATS Score ──────────────────────────────────────────────────────────────
function computeATSScore(resumeText, jdText, jdKeywords) {
  let hits = 0;
  for (const k of jdKeywords) {
    const match = findKeywordMatch(k, resumeText);
    if (match.present) hits++;
  }
  const keywordScore = jdKeywords.length > 0 ? (hits / jdKeywords.length) * 70 : 35;
  const resumeWords = new Set(tokenizer.tokenize(resumeText.toLowerCase()));
  const jdWords = tokenizer.tokenize(jdText.toLowerCase());
  const overlap = jdWords.filter(w => w.length > 3 && resumeWords.has(w)).length;
  const semanticScore = Math.min((overlap / Math.max(jdWords.length, 1)) * 30 * 5, 30);
  return Math.min(Math.round(keywordScore + semanticScore), 98);
}

// ─── Gap Analysis ───────────────────────────────────────────────────────────
function analyzeGaps(resumeObj, jobDescription) {
  const jdKeywords = extractJDKeywords(jobDescription);
  const gaps = [];
  const resumeStr = JSON.stringify(resumeObj);

  for (const keyword of jdKeywords) {
    const match = findKeywordMatch(keyword, resumeStr);
    if (!match.present) {
      gaps.push({ type: "missing_keyword", keyword });
    } else if (!match.exact) {
      // Find where it is located to target the patch
      let location = null;
      if (resumeObj.experience) {
        resumeObj.experience.forEach((exp, expIdx) => {
          if (exp.bullets) {
            exp.bullets.forEach((bullet, bIdx) => {
              if (bullet.toLowerCase().includes(match.foundAs)) {
                location = [expIdx, bIdx];
              }
            });
          }
        });
      }
      if (location) {
        gaps.push({ type: "weak_phrasing", keyword, foundAs: match.foundAs, location });
      } else {
        gaps.push({ type: "missing_keyword", keyword });
      }
    }
  }

  // Second pass: for missing_keyword, assign a fallback location for AI to weave it in
  for (const gap of gaps) {
    if (gap.type === "missing_keyword") {
      let fallbackLocation = null;
      if (resumeObj.experience && resumeObj.experience.length > 0 && resumeObj.experience[0].bullets && resumeObj.experience[0].bullets.length > 0) {
        // Just pick the very first bullet of the most recent job as a chance for the AI to weave it in
        fallbackLocation = [0, 0];
      }
      if (fallbackLocation) {
        gap.location = fallbackLocation;
      }
    }
  }

  return gaps;
}

// ─── Validation ─────────────────────────────────────────────────────────────
function validateRewordedBullet(original, reworded) {
  if (!reworded || reworded.trim().length < 10) return false;
  const banned = ['fallback', 'strong skills matching this role', 'led critical projects', 'delivered on key metrics', 'experienced professional'];
  if (banned.some(p => reworded.toLowerCase().includes(p))) return false;
  const origNums = original.match(/\d+/g) || [];
  const rewNums = reworded.match(/\d+/g) || [];
  if (origNums.length > 0 && origNums.some(n => !rewNums.includes(n))) return false;
  if (reworded.length > original.length * 1.8 || reworded.length < original.length * 0.4) return false;
  return true;
}

// ─── Patch Generation ───────────────────────────────────────────────────────
async function generatePatches(resumeObj, gaps, jobTitle) {
  const patches = [];
  
  // 1. Skills Reordering
  if (resumeObj.skills) {
    const jdSkillSet = new Set(gaps.map(g => g.keyword.toLowerCase()));
    // We treat missing/weak keywords as target targets
    
    for (const category in resumeObj.skills) {
      const skillsArray = resumeObj.skills[category];
      if (Array.isArray(skillsArray)) {
        const matched = skillsArray.filter(s => {
          return Array.from(jdSkillSet).some(k => s.toLowerCase().includes(k) || k.includes(s.toLowerCase()));
        });
        const unmatched = skillsArray.filter(s => !matched.includes(s));
        patches.push({ field: `skills["${category}"]`, action: "reorder", newValue: [...matched, ...unmatched] });
      }
    }

    // Safely append missing keywords to the first skills category if they don't naturally fit anywhere
    const missingSkills = gaps.filter(g => g.type === "missing_keyword").map(g => g.keyword);
    if (missingSkills.length > 0) {
      const cat = resumeObj.skills["Tools & Platforms"] ? "Tools & Platforms" : Object.keys(resumeObj.skills)[0];
      if (cat) {
        const existing = resumeObj.skills[cat] || [];
        // Only append if not already in patches
        const existingPatch = patches.find(p => p.field === `skills["${cat}"]`);
        if (existingPatch) {
          existingPatch.newValue = [...new Set([...missingSkills, ...existingPatch.newValue])];
        } else {
          patches.push({ field: `skills["${cat}"]`, action: "append", newValue: [...new Set([...missingSkills, ...existing])] });
        }
      }
    }
  }

  // 2. Bullet Rewording (targets BOTH weak_phrasing and missing_keyword that have a location)
  for (const gap of gaps.filter(g => (g.type === "weak_phrasing" || g.type === "missing_keyword") && g.location)) {
    const [expIndex, bulletIndex] = gap.location;
    const original = resumeObj.experience[expIndex].bullets[bulletIndex];
    
    let reworded = await creativelyRewordBullet(original, [gap.keyword], resumeObj.title || jobTitle);
    
    if (validateRewordedBullet(original, reworded)) {
      patches.push({ field: `experience[${expIndex}].bullets[${bulletIndex}]`, action: "replace", newValue: reworded });
    } else {
      // Retry once
      reworded = await creativelyRewordBullet(original, [gap.keyword], resumeObj.title || jobTitle);
      if (validateRewordedBullet(original, reworded)) {
        patches.push({ field: `experience[${expIndex}].bullets[${bulletIndex}]`, action: "replace", newValue: reworded });
      }
    }
  }

  return patches;
}

// ─── Patch Application ──────────────────────────────────────────────────────
function applyPatches(resumeObj, patches) {
  const edited = structuredClone(resumeObj); 
  for (const patch of patches) {
    setByPath(edited, patch.field, patch.newValue);
  }
  return edited;
}

// ─── Main Tailor Function ────────────────────────────────────────────────────
async function tailorResumeToTarget(resumeObj, jobDescriptionText, targetScore = 90) {
  if (!resumeObj || typeof resumeObj !== 'object') {
    throw new Error('Invalid resume object provided to tailor Engine.');
  }

  const jdKeywords = extractJDKeywords(jobDescriptionText);
  let gaps = analyzeGaps(resumeObj, jobDescriptionText);
  let patches = await generatePatches(resumeObj, gaps, resumeObj.title || 'Professional');
  let edited = applyPatches(resumeObj, patches);
  let score = computeATSScore(JSON.stringify(edited), jobDescriptionText, jdKeywords);

  if (score < targetScore) {
    const remainingGaps = analyzeGaps(edited, jobDescriptionText);
    const additionalPatches = await generatePatches(edited, remainingGaps, resumeObj.title || 'Professional');
    if (additionalPatches.length > 0) {
      edited = applyPatches(edited, additionalPatches);
      patches = patches.concat(additionalPatches);
      score = computeATSScore(JSON.stringify(edited), jobDescriptionText, jdKeywords);
    }
  }

  return {
    editedResumeObject: edited,
    atsScoreBefore: computeATSScore(JSON.stringify(resumeObj), jobDescriptionText, jdKeywords),
    atsScoreAfter: score,
    patchesApplied: patches,
    missingSkills: analyzeGaps(edited, jobDescriptionText).filter(g => g.type === 'missing_keyword').map(g => g.keyword)
  };
}

module.exports = {
  tailorResumeToTarget,
  analyzeGaps,
  generatePatches,
  applyPatches,
  extractJDKeywords,
  computeATSScore
};
