const natural = require('natural');
const fs = require('fs');
const path = require('path');
const { creativelyRewordBullet, creativelyWriteSummary } = require('./ollamaClient');

const synonyms = JSON.parse(fs.readFileSync(path.join(__dirname, '../synonyms.json'), 'utf-8'));
const skillsList = JSON.parse(fs.readFileSync(path.join(__dirname, '../skills.json'), 'utf-8'));
const TfIdf = natural.TfIdf;
const tokenizer = new natural.WordTokenizer();

// ─── Keyword Extraction ─────────────────────────────────────────────────────
function extractJDKeywords(jdText) {
  const lower = jdText.toLowerCase();
  // Only extract known skills — avoids NLP garbage like "apps", "role", "team"
  const found = skillsList.filter(skill => lower.includes(skill.toLowerCase()));
  // Also grab multi-word tech phrases
  const techPhrases = lower.match(/\b(?:machine learning|deep learning|data science|product management|project management|ui\/ux|rest api|node\.js|react\.js|next\.js|vue\.js|angular|spring boot|django|ruby on rails|ci\/cd|azure|google cloud|natural language processing)\b/g) || [];
  return [...new Set([...found, ...techPhrases])].filter(k => k.length > 1);
}

// ─── Resume Section Parser ───────────────────────────────────────────────────
function parseResumeSections(resumeText) {
  const lines = resumeText.split('\n').map(l => l.trim()).filter(Boolean);
  const sections = { summary: '', skillsList: [], experienceBullets: [], education: '', name: '' };

  const sectionHeaders = {
    summary: /^(summary|profile|objective|about me|professional summary|executive summary)/i,
    skills: /^(skills|technologies|tech stack|core competencies|technical skills|tools|programming languages|frameworks|libraries)/i,
    experience: /^(experience|work experience|employment|work history|professional experience|projects|relevant projects|personal projects|academic projects)/i,
    education: /^(education|academic|qualification|degree|certifications)/i,
  };

  let currentSection = 'header';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect section headers (usually short lines)
    if (line.length < 40) {
      if (sectionHeaders.summary.test(line)) { currentSection = 'summary'; continue; }
      if (sectionHeaders.skills.test(line)) { currentSection = 'skills'; continue; }
      if (sectionHeaders.experience.test(line)) { currentSection = 'experience'; continue; }
      if (sectionHeaders.education.test(line)) { currentSection = 'education'; continue; }
    }

    // First non-empty lines = name/contact (header section)
    if (currentSection === 'header') {
      if (i === 0) sections.name = line;
      sections.summary += line + ' ';
      continue;
    }

    if (currentSection === 'summary') {
      sections.summary += line + ' ';
    } else if (currentSection === 'skills') {
      // Handle comma-separated, pipe-separated, bullet lists
      const skills = line.split(/[,|•·\t]/).map(s => s.replace(/^[-•·*]\s*/, '').trim()).filter(s => s.length > 1 && s.length < 40);
      sections.skillsList.push(...skills);
    } else if (currentSection === 'experience') {
      // Any line that looks like a bullet/achievement
      const isBullet = /^[-•·*]/.test(line) || /^(developed|built|led|managed|created|designed|implemented|improved|increased|reduced|delivered|launched|architected|engineered|optimized|collaborated|worked|maintained|integrated|deployed|automated|streamlined)/i.test(line);
      if (isBullet || (line.length > 25 && !line.match(/^\d{4}/) && !/^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i.test(line))) {
        const cleaned = line.replace(/^[-•·*]\s*/, '').trim();
        if (cleaned.length > 10) sections.experienceBullets.push({ original: cleaned });
      }
    } else if (currentSection === 'education') {
      sections.education += line + '\n';
    }
  }

  // Fallback: if no skills section found or poorly parsed, extract from full text using skills.json
  if (sections.skillsList.length < 5) {
    const lower = resumeText.toLowerCase();
    sections.skillsList = skillsList.filter(s => lower.includes(s.toLowerCase()));
  }

  // Fallback: if no bullets found, split paragraphs into pseudo-bullets
  if (sections.experienceBullets.length === 0) {
    const sentences = resumeText.match(/[^.!?\n]+[.!?]/g) || [];
    const actionSentences = sentences.filter(s =>
      /\b(developed|built|led|managed|created|designed|implemented|improved|increased|reduced|delivered|launched|integrated|deployed|automated|engineered)\b/i.test(s)
    );
    sections.experienceBullets = actionSentences.slice(0, 8).map(s => ({ original: s.trim() }));
  }

  // Clean up skills: remove long strings, headers, keep it concise
  sections.skillsList = [...new Set(
    sections.skillsList
      .map(s => s.replace(/^(Programming Languages|Frameworks & Libraries|Databases & Infra|Tools & Platforms|Soft Skills|Tech):?/i, '').trim())
      .filter(s => s.length > 1 && s.length < 30)
  )];
  sections.summary = sections.summary.trim();
  return sections;
}

// ─── Keyword Match ──────────────────────────────────────────────────────────
async function findKeywordMatch(jdKeyword, resumeText) {
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
async function computeATSScore(resumeText, jdText, jdKeywords) {
  let hits = 0;
  for (const k of jdKeywords) {
    const match = await findKeywordMatch(k, resumeText);
    if (match.present) hits++;
  }

  const keywordScore = jdKeywords.length > 0 ? (hits / jdKeywords.length) * 70 : 35;

  // Simple word overlap for semantic score
  const resumeWords = new Set(tokenizer.tokenize(resumeText.toLowerCase()));
  const jdWords = tokenizer.tokenize(jdText.toLowerCase());
  const overlap = jdWords.filter(w => w.length > 3 && resumeWords.has(w)).length;
  const semanticScore = Math.min((overlap / Math.max(jdWords.length, 1)) * 30 * 5, 30);

  return Math.min(Math.round(keywordScore + semanticScore), 98);
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

// ─── Main Tailor Function ────────────────────────────────────────────────────
async function tailorResume(originalResumeText, jobDescriptionText, profile, mode = 'creative', jobTitle = 'Professional') {
  if (!originalResumeText || originalResumeText.trim().length < 20) {
    throw new Error('Resume text is empty or too short to tailor.');
  }
  if (!jobDescriptionText || jobDescriptionText.trim().length < 20) {
    throw new Error('Job description is empty.');
  }

  const jdKeywords = extractJDKeywords(jobDescriptionText);
  const sections = parseResumeSections(originalResumeText);

  // Score each keyword against resume
  const scoredKeywords = [];
  for (const k of jdKeywords) {
    scoredKeywords.push({ keyword: k, match: await findKeywordMatch(k, originalResumeText) });
  }

  // Reorder skills: JD-matching ones first
  const jdSkillSet = new Set(jdKeywords.map(k => k.toLowerCase()));
  const reorderedSkills = [
    ...sections.skillsList.filter(s => jdSkillSet.has(s.toLowerCase())),
    ...sections.skillsList.filter(s => !jdSkillSet.has(s.toLowerCase()))
  ].slice(0, 20); // cap at 20 skills

  // TF-IDF score bullets by relevance to JD
  const tfidf = new TfIdf();
  tfidf.addDocument(jobDescriptionText);

  let rankedBullets = sections.experienceBullets.map(b => {
    let score = 0;
    tfidf.listTerms(0).forEach(item => {
      if (b.original.toLowerCase().includes(item.term)) score += item.tfidf;
    });
    return { ...b, relevance: score };
  }).sort((a, b) => b.relevance - a.relevance);

  let finalBullets = [];
  let finalSummary = sections.summary;
  const changesMade = [];

  if (mode === 'conservative') {
    // Pure rule-based synonym swap
    finalBullets = rankedBullets.map(b => {
      let text = b.original;
      scoredKeywords.forEach(k => {
        if (k.match.present && !k.match.exact && k.match.foundAs) {
          text = text.replace(new RegExp(`\\b${k.match.foundAs}\\b`, 'gi'), k.keyword);
        }
      });
      return text;
    });
    changesMade.push('Conservative mode: reordered + synonym swap.');
  } else {
    // Creative Gemini mode — reword each bullet
    for (const b of rankedBullets) {
      let reworded = await creativelyRewordBullet(b.original, jdKeywords.slice(0, 10), jobTitle);
      if (!validateRewordedBullet(b.original, reworded)) {
        // Retry once
        reworded = await creativelyRewordBullet(b.original, jdKeywords.slice(0, 10), jobTitle);
        if (!validateRewordedBullet(b.original, reworded)) {
          reworded = b.original; // Always fallback to original — never show junk
        }
      }
      finalBullets.push(reworded);
    }

    // Generate summary
    const topSkills = reorderedSkills.slice(0, 5);
    const yrs = profile.years_experience || 0;
    const edu = sections.education || profile.education_level || 'Computer Science';
    let newSummary = await creativelyWriteSummary(yrs, topSkills, jobTitle, edu);

    // Validate summary — must be real, not generic
    const isValidSummary = newSummary &&
      newSummary.length > 40 &&
      !newSummary.toLowerCase().includes('fallback') &&
      !newSummary.toLowerCase().includes('experienced professional with strong skills');

    if (isValidSummary) {
      finalSummary = newSummary;
      changesMade.push('Generated AI-tailored summary.');
    } else {
      // Rule-based fallback summary
      finalSummary = `${yrs > 0 ? yrs + '+ years' : 'Experienced'} ${jobTitle} with expertise in ${topSkills.slice(0, 3).join(', ')}.`;
      changesMade.push('Used rule-based summary fallback.');
    }
  }

  const finalResumeText = [finalSummary, reorderedSkills.join(', '), finalBullets.join('\n'), sections.education].join('\n\n');

  const scoreBefore = await computeATSScore(originalResumeText, jobDescriptionText, jdKeywords);
  const scoreAfter = await computeATSScore(finalResumeText, jobDescriptionText, jdKeywords);

  return {
    tailoredData: {
      summary: finalSummary,
      skills: reorderedSkills,
      experience_bullets: finalBullets,
      education: sections.education.trim() || profile.education_level || ''
    },
    ats_score_before: scoreBefore,
    ats_score_after: scoreAfter,
    changes_made: changesMade,
    keywords_added: scoredKeywords.filter(k => k.match.present).map(k => k.keyword)
  };
}

module.exports = {
  tailorResume,
  extractJDKeywords,
  parseResumeSections,
  findKeywordMatch,
  computeATSScore
};
