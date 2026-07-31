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
      model: 'gemini-flash-lite-latest',
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
  const fallback = `${yearsExperience > 0 ? yearsExperience + '+' : 'Experienced'} years of experience in ${topSkills.slice(0,3).join(", ")}, with a background in ${educationLevel.substring(0, 30)}.`;
  
  const prompt = `Write a professional 2-3 sentence resume summary for a candidate based on EXACTLY these facts:
- ${yearsExperience} years of experience
- Top skills: ${topSkills.join(", ")}
- Education background: ${educationLevel}

Target Job Context (DO NOT claim the candidate currently holds this title, just tailor the tone): ${jobTitle}

Do NOT invent any other companies, achievements, or numbers. Just weave these facts into a compelling professional summary.
Return ONLY valid JSON: {"summary": "..."}`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-flash-lite-latest',
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

async function parseResumeToStructuredObject(rawResumeText) {
  const prompt = `Parse the following raw resume text into a highly structured JSON object. 
Extract every single detail accurately. Do NOT invent anything. Do NOT drop anything.

MANDATORY JSON SCHEMA:
{
  "name": "string",
  "title": "string (the candidate's professional title, e.g., 'Software Engineer')",
  "contact": { "phone": "string", "email": "string", "linkedin": "string", "github": "string", "leetcode": "string", "location": "string" },
  "summary": "string",
  "skills": { 
    "Programming Languages": ["...", "..."], 
    "Frameworks & Libraries": ["...", "..."], 
    "Databases & Infra": ["...", "..."], 
    "Tools & Platforms": ["...", "..."], 
    "Soft Skills": ["...", "..."]
  }, // Map to exact categories if present in text, otherwise create logical categories.
  "experience": [
    { "company": "string", "title": "string", "dates": "string", "bullets": ["string", "string"] }
  ],
  "education": [
    { "institution": "string", "degree": "string", "dates": "string", "details": ["string"] }
  ],
  "awards": ["string"],
  "projects": [
    { "name": "string", "title": "string", "dates": "string", "bullets": ["string"] }
  ]
}

If a field is not found in the text, leave it empty (empty string for strings, empty array for arrays).

RAW RESUME TEXT:
${rawResumeText}`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.1
      }
    });
    
    return JSON.parse(response.text);
  } catch (err) {
    console.error('Gemini Parse Error:', err.message);
    throw new Error('Failed to parse resume into structured object.');
  }
}

module.exports = { creativelyRewordBullet, creativelyWriteSummary, parseResumeToStructuredObject };
