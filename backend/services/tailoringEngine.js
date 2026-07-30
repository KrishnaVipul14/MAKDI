const nlp = require('compromise');
const natural = require('natural');
const fs = require('fs');
const path = require('path');
const { creativelyRewordBullet, creativelyWriteSummary } = require('./ollamaClient');

const synonyms = JSON.parse(fs.readFileSync(path.join(__dirname, '../synonyms.json'), 'utf-8'));
const TfIdf = natural.TfIdf;
const wordnet = new natural.WordNet();

// Fallback basic skills list for extraction if natural/compromise miss industry jargon
const fallbackSkills = ["javascript", "python", "java", "c++", "react", "node.js", "sql", "aws", "docker", "agile", "leadership", "management", "sales", "marketing", "design"];

function getWordNetSynonyms(word) {
  return new Promise((resolve) => {
    wordnet.lookup(word, (results) => {
      let syns = new Set();
      results.forEach(result => {
        result.synonyms.forEach(syn => syns.add(syn.replace(/_/g, ' ')));
      });
      resolve(Array.from(syns));
    });
  });
}

function extractJDKeywords(jobDescriptionText) {
  const doc = nlp(jobDescriptionText);
  const nounPhrases = doc.nouns().out('array').map(w => w.toLowerCase());
  const words = jobDescriptionText.toLowerCase().split(/\W+/);
  
  const skillMatches = fallbackSkills.filter(skill => 
    jobDescriptionText.toLowerCase().includes(skill.toLowerCase())
  );
  
  return [...new Set([...nounPhrases, ...skillMatches])].filter(k => k.length > 2);
}

function parseResumeSections(resumeText) {
  const lines = resumeText.split('\n');
  const sections = { summary: '', skillsList: [], experienceBullets: [], education: '' };
  
  let currentSection = 'summary';
  
  const headers = {
    summary: /summary|profile|about/i,
    skills: /skills|technologies|core competencies/i,
    experience: /experience|employment|work history/i,
    education: /education|academic/i
  };

  for (let line of lines) {
    const cleanLine = line.trim();
    if (!cleanLine) continue;

    if (cleanLine.length < 30) {
      if (headers.skills.test(cleanLine)) { currentSection = 'skills'; continue; }
      if (headers.experience.test(cleanLine)) { currentSection = 'experience'; continue; }
      if (headers.education.test(cleanLine)) { currentSection = 'education'; continue; }
      if (headers.summary.test(cleanLine)) { currentSection = 'summary'; continue; }
    }

    if (currentSection === 'summary') {
      sections.summary += line + '\n';
    } else if (currentSection === 'skills') {
      // split comma-separated or bulleted lists
      const skills = line.split(/[,|•]/).map(s => s.trim().replace(/^[-•]\s*/, '')).filter(s => s);
      sections.skillsList.push(...skills);
    } else if (currentSection === 'experience') {
      if (line.match(/^[-•]/) || line.trim().length > 20) {
        sections.experienceBullets.push({ original: line.trim().replace(/^[-•]\s*/, ''), role: 'Role' });
      }
    } else if (currentSection === 'education') {
      sections.education += line + '\n';
    }
  }
  
  sections.skillsList = [...new Set(sections.skillsList)];
  return sections;
}

async function findKeywordMatch(jdKeyword, resumeText) {
  const lowerResume = resumeText.toLowerCase();
  const lowerKeyword = jdKeyword.toLowerCase();
  
  if (lowerResume.includes(lowerKeyword)) {
    return { present: true, exact: true };
  }
  
  const manualSynonyms = synonyms[lowerKeyword] || [];
  for (const syn of manualSynonyms) {
    if (lowerResume.includes(syn)) return { present: true, exact: false, foundAs: syn };
  }
  
  // Backwards lookup (is keyword a synonym of something in resume)
  for (const [key, syns] of Object.entries(synonyms)) {
    if (syns.includes(lowerKeyword) && lowerResume.includes(key)) {
      return { present: true, exact: false, foundAs: key };
    }
  }

  const wordnetSyns = await getWordNetSynonyms(lowerKeyword);
  for (const syn of wordnetSyns) {
    if (lowerResume.includes(syn)) return { present: true, exact: false, foundAs: syn };
  }
  
  return { present: false };
}

function cosineSimilarityTFIDF(text1, text2) {
  const tfidf = new TfIdf();
  tfidf.addDocument(text1);
  tfidf.addDocument(text2);
  
  // Very rough approximation of overlap
  let score1 = 0;
  tfidf.listTerms(0).forEach(item => {
    if (text2.toLowerCase().includes(item.term)) score1 += item.tfidf;
  });
  
  return Math.min(score1 / (tfidf.listTerms(0).length || 1) * 100, 1); 
}

async function computeATSScore(resumeText, jdText, jdKeywords) {
  let hits = 0;
  for (const k of jdKeywords) {
    const match = await findKeywordMatch(k, resumeText);
    if (match.present) hits++;
  }
  
  const keywordScore = jdKeywords.length > 0 ? (hits / jdKeywords.length) * 70 : 0;
  const semanticScore = cosineSimilarityTFIDF(resumeText, jdText) * 30;
  
  return Math.min(Math.round(keywordScore + semanticScore), 100);
}

function validateRewordedBullet(original, reworded) {
  const bannedPhrases = ["fallback", "strong skills matching this role", "led critical projects", "delivered on key metrics"];
  const lower = reworded.toLowerCase();

  if (bannedPhrases.some(p => lower.includes(p))) return false;

  const originalNumbers = original.match(/\d+/g) || [];
  const rewordedNumbers = reworded.match(/\d+/g) || [];
  if (originalNumbers.length > 0 && originalNumbers.some(n => !rewordedNumbers.includes(n))) return false;

  if (reworded.length > original.length * 1.6 || reworded.length < original.length * 0.5) return false;

  return true;
}

function safeRewordBulletsRuleBased(bullets, scoredKeywords) {
  // Pure rule-based targeted substitution (v3 logic)
  return bullets.map(b => {
    let newText = b.original;
    scoredKeywords.forEach(k => {
      if (k.match.present && !k.match.exact && k.match.foundAs) {
        // Swap synonym for exact keyword
        const regex = new RegExp(`\\b${k.match.foundAs}\\b`, 'gi');
        newText = newText.replace(regex, k.keyword);
      }
    });
    return { ...b, edited: newText };
  });
}

async function tailorResume(originalResumeText, jobDescriptionText, profile, mode = 'creative', jobTitle = 'Role') {
  const jdKeywords = extractJDKeywords(jobDescriptionText);
  const sections = parseResumeSections(originalResumeText);

  // Score keywords
  const scoredKeywords = [];
  for (const k of jdKeywords) {
    scoredKeywords.push({
      keyword: k,
      match: await findKeywordMatch(k, originalResumeText)
    });
  }

  // Promote skills
  let reorderedSkills = [...sections.skillsList];
  scoredKeywords.forEach(k => {
    if (k.match.present && !reorderedSkills.some(s => s.toLowerCase() === k.keyword.toLowerCase())) {
      reorderedSkills.unshift(k.keyword);
    }
  });

  // Reorder bullets by TF-IDF relevance
  const tfidf = new TfIdf();
  tfidf.addDocument(jobDescriptionText);
  
  let reorderedBullets = sections.experienceBullets.map(b => {
    let score = 0;
    tfidf.listTerms(0).forEach(item => {
      if (b.original.toLowerCase().includes(item.term)) score += item.tfidf;
    });
    return { ...b, relevance: score };
  });
  
  reorderedBullets.sort((a, b) => b.relevance - a.relevance);

  let finalBullets = [];
  let finalSummary = sections.summary.trim() || '';
  const changesMade = [];

  if (mode === 'conservative') {
    // Pure rule-based swap
    finalBullets = safeRewordBulletsRuleBased(reorderedBullets, scoredKeywords).map(b => b.edited);
    changesMade.push("Used Conservative rule-based reordering and synonym replacement.");
  } else {
    // Hybrid Creative LLM Mode
    for (const b of reorderedBullets) {
      let reworded = await creativelyRewordBullet(b.original, jdKeywords, jobTitle);
      if (!validateRewordedBullet(b.original, reworded)) {
        // Retry once
        reworded = await creativelyRewordBullet(b.original, jdKeywords, jobTitle);
        if (!validateRewordedBullet(b.original, reworded)) {
          reworded = b.original; // Fallback
          changesMade.push(`Fallback to original for bullet: "${b.original.substring(0, 20)}..."`);
        } else {
          changesMade.push(`Creatively reworded bullet successfully.`);
        }
      } else {
        changesMade.push(`Creatively reworded bullet successfully.`);
      }
      finalBullets.push(reworded);
    }
    
    // Summary
    const topSkills = profile.parsed_skills ? JSON.parse(profile.parsed_skills) : [];
    const yrs = profile.years_experience || 0;
    let newSummary = await creativelyWriteSummary(yrs, topSkills, jobTitle, sections.education);
    if (!newSummary.includes(yrs.toString()) || newSummary.length < 20) {
      newSummary = `${yrs}+ years of experience in ${topSkills.slice(0,3).join(", ")}, with a background in ${sections.education.substring(0, 30)}.`;
      changesMade.push("Fallback rule-based summary used.");
    } else {
      changesMade.push("Creatively rewrote summary successfully.");
    }
    finalSummary = newSummary;
  }

  const finalResumeText = [
    finalSummary,
    reorderedSkills.join(', '),
    finalBullets.join('\n'),
    sections.education
  ].join('\n\n');

  const scoreBefore = await computeATSScore(originalResumeText, jobDescriptionText, jdKeywords);
  const scoreAfter = await computeATSScore(finalResumeText, jobDescriptionText, jdKeywords);

  return {
    tailoredData: {
      summary: finalSummary,
      skills: reorderedSkills,
      experience_bullets: finalBullets,
      education: sections.education.trim()
    },
    edited_resume_text: finalResumeText,
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
