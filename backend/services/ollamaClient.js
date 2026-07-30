const { GoogleGenAI } = require('@google/genai');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function creativelyRewordBullet(originalBullet, jdKeywordsRelevantToThisBullet, jobTitle) {
  const prompt = `You are editing ONE bullet point from a resume. Rewrite it to sound more impactful and to naturally incorporate relevant terminology from a job description — WITHOUT changing any fact, number, company name, or claim.

STRICT RULES:
- Do not add any skill, tool, metric, or achievement not already stated in the original bullet.
- Do not change any number, percentage, or date.
- You MAY improve the verb choice, sentence structure, and phrasing to sound more professional and impactful.
- You MAY naturally weave in this job's relevant terminology, ONLY where it truthfully describes what the original bullet already says.
- Keep it to a single bullet point, one sentence, similar length to the original (+/- 20%).

ORIGINAL BULLET: "${originalBullet}"
RELEVANT JOB KEYWORDS FOR CONTEXT: ${jdKeywordsRelevantToThisBullet.join(", ")}
TARGET JOB TITLE: ${jobTitle}

Return ONLY valid JSON: {"reworded": "..."}`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-lite',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.6
      }
    });
    
    const text = response.text;
    return JSON.parse(text).reworded || originalBullet;
  } catch (err) {
    console.error('Gemini Reword Error:', err.message);
    return originalBullet; // Fallback instantly if Gemini fails
  }
}

async function creativelyWriteSummary(yearsExperience, topSkills, jobTitle, educationLevel) {
  const fallback = `${yearsExperience}+ years of experience in ${topSkills.slice(0,3).join(", ")}, with a background in ${educationLevel.substring(0, 30)}.`;
  
  const prompt = `Write a professional 2-3 sentence resume summary for a ${jobTitle}.
Use EXACTLY these facts:
- ${yearsExperience} years of experience
- Top skills: ${topSkills.join(", ")}
- Education background: ${educationLevel}

Do NOT invent any other companies, achievements, or numbers. Just weave these facts into a compelling professional summary.
Return ONLY valid JSON: {"summary": "..."}`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-lite',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.7
      }
    });
    
    const text = response.text;
    return JSON.parse(text).summary || fallback;
  } catch (err) {
    console.error('Gemini Summary Error:', err.message);
    return fallback;
  }
}

module.exports = { creativelyRewordBullet, creativelyWriteSummary };
