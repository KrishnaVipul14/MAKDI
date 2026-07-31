const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

async function generatePdfFromHtml(htmlContent, filename) {
  const uploadDir = path.join(__dirname, '..', 'uploads');
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
  
  const filePath = path.join(uploadDir, filename);

  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
  await page.pdf({ path: filePath, format: 'A4', printBackground: true });
  
  await browser.close();
  return filePath;
}

function buildContactLine(contact) {
  if (!contact) return '';
  const fields = [
    contact.phone,
    contact.email,
    contact.location,
    contact.linkedin,
    contact.github,
    contact.leetcode
  ].filter(f => f && typeof f === 'string' && f.trim().length > 0);
  
  return fields.join(' | ');
}

function buildResumeHtml(resumeObj) {
  const contactLine = buildContactLine(resumeObj.contact);
  
  // Skills
  let skillsHtml = '';
  if (resumeObj.skills) {
    for (const [cat, items] of Object.entries(resumeObj.skills)) {
      if (Array.isArray(items) && items.length > 0) {
        skillsHtml += `<div class="skill-cat"><strong>${cat}:</strong> ${items.join(', ')}</div>`;
      }
    }
  }

  // Experience
  let expHtml = '';
  if (resumeObj.experience && Array.isArray(resumeObj.experience)) {
    resumeObj.experience.forEach(exp => {
      expHtml += `
        <div class="exp-item">
          <div class="exp-header">
            <strong>${exp.title || ''}</strong> at ${exp.company || ''} <span class="exp-dates">${exp.dates || ''}</span>
          </div>
          <ul>
            ${(exp.bullets || []).map(b => `<li class="exp-bullet">${b}</li>`).join('')}
          </ul>
        </div>
      `;
    });
  }

  // Education
  let eduHtml = '';
  if (resumeObj.education && Array.isArray(resumeObj.education)) {
    resumeObj.education.forEach(edu => {
      eduHtml += `
        <div class="edu-item">
          <strong>${edu.institution || ''}</strong> - ${edu.degree || ''} <span class="exp-dates">${edu.dates || ''}</span>
        </div>
      `;
    });
  }

  // Awards/Projects
  let awardsHtml = '';
  if (resumeObj.awards && Array.isArray(resumeObj.awards) && resumeObj.awards.length > 0) {
    awardsHtml = `<h2>Awards</h2><ul>${resumeObj.awards.map(a => `<li>${a}</li>`).join('')}</ul>`;
  }
  
  let projectsHtml = '';
  if (resumeObj.projects && Array.isArray(resumeObj.projects) && resumeObj.projects.length > 0) {
    projectsHtml = `<h2>Projects</h2>`;
    resumeObj.projects.forEach(proj => {
      projectsHtml += `
        <div class="exp-item">
          <div class="exp-header">
            <strong>${proj.name || ''}</strong> ${proj.title ? '- ' + proj.title : ''} <span class="exp-dates">${proj.dates || ''}</span>
          </div>
          <ul>
            ${(proj.bullets || []).map(b => `<li class="exp-bullet">${b}</li>`).join('')}
          </ul>
        </div>
      `;
    });
  }

  return `
    <html>
      <head>
        <style>
          body { font-family: 'Inter', sans-serif; padding: 40px; color: #333; line-height: 1.6; }
          h1 { color: #1B7A3D; margin-bottom: 5px; }
          .title { font-size: 16px; font-weight: bold; color: #555; margin-bottom: 15px; }
          .contact { font-size: 14px; color: #666; margin-bottom: 20px; border-bottom: 2px solid #1B7A3D; padding-bottom: 10px; }
          h2 { color: #1B7A3D; font-size: 18px; margin-top: 20px; border-bottom: 1px solid #ddd; }
          .skill-cat { margin-bottom: 5px; font-size: 14px; }
          .exp-item { margin-bottom: 15px; }
          .exp-header { font-size: 15px; margin-bottom: 5px; display: flex; justify-content: space-between;}
          .exp-dates { color: #666; font-size: 13px; }
          .exp-bullet { margin-bottom: 4px; font-size: 14px; }
          .edu-item { margin-bottom: 10px; font-size: 14px; display: flex; justify-content: space-between;}
        </style>
      </head>
      <body>
        <h1>${resumeObj.name || 'Candidate Name'}</h1>
        <div class="title">${resumeObj.title || ''}</div>
        <div class="contact">
          ${contactLine}
        </div>
        
        <h2>Professional Summary</h2>
        <p>${resumeObj.summary || ''}</p>
        
        <h2>Skills</h2>
        ${skillsHtml}
        
        <h2>Experience</h2>
        ${expHtml}
        
        ${projectsHtml}
        
        <h2>Education</h2>
        ${eduHtml}

        ${awardsHtml}
      </body>
    </html>
  `;
}

module.exports = { generatePdfFromHtml, buildResumeHtml };
