const fs = require('fs');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const nlp = require('compromise');
const path = require('path');

const skillsList = require('../skills.json');

// Helper to calculate experience from text using basic regex
function extractExperience(text) {
  const expMatch = text.match(/(\d+)\+?\s*(years|yrs)\s+of\s+experience/i);
  if (expMatch) return parseFloat(expMatch[1]);
  return 0; // Default or AI extraction logic later
}

// Helper to extract education level
function extractEducation(text) {
  const textLower = text.toLowerCase();
  if (textLower.includes('ph.d') || textLower.includes('phd')) return 'PhD';
  if (textLower.includes('master') || textLower.includes('m.s') || textLower.includes('m.b.a')) return 'Masters';
  if (textLower.includes('bachelor') || textLower.includes('b.s') || textLower.includes('b.a') || textLower.includes('b.tech')) return 'Undergrad';
  return 'Undergrad'; // fallback
}

// Extract skills using compromise and our custom dictionary
function extractSkills(text) {
  const doc = nlp(text.toLowerCase());
  const foundSkills = new Set();
  
  skillsList.forEach(skill => {
    if (doc.match(skill).found) {
      foundSkills.add(skill);
    }
  });

  return Array.from(foundSkills);
}

async function parseResumeFile(filePath, mimetype) {
  let text = '';
  
  if (mimetype === 'application/pdf') {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(dataBuffer);
    text = data.text;
  } else if (mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    const result = await mammoth.extractRawText({ path: filePath });
    text = result.value;
  } else {
    throw new Error('Unsupported file format. Please upload PDF or DOCX.');
  }

  const parsed_skills = extractSkills(text);
  const parsed_education = extractEducation(text);
  const parsed_experience_years = extractExperience(text);

  return {
    parsed_text: text,
    parsed_skills,
    parsed_education,
    parsed_experience_years
  };
}

module.exports = { parseResumeFile };
