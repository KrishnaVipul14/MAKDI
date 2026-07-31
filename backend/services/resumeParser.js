const fs = require('fs');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const { parseResumeToStructuredObject } = require('./ollamaClient');

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

  // Use the one-time strict JSON-mode Gemini call to structure the object perfectly
  const structuredData = await parseResumeToStructuredObject(text);

  return {
    parsed_text: text, // keep raw text just in case, but structured_json is the source of truth
    structured_json: structuredData
  };
}

module.exports = { parseResumeFile };

module.exports = { parseResumeFile };
