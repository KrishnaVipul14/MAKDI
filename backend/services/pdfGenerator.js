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

function buildResumeHtml(profile, tailoredData) {
  return `
    <html>
      <head>
        <style>
          body { font-family: 'Inter', sans-serif; padding: 40px; color: #333; line-height: 1.6; }
          h1 { color: #1B7A3D; margin-bottom: 5px; }
          .contact { font-size: 14px; color: #666; margin-bottom: 20px; border-bottom: 2px solid #1B7A3D; padding-bottom: 10px; }
          h2 { color: #1B7A3D; font-size: 18px; margin-top: 20px; border-bottom: 1px solid #ddd; }
          .skills { display: flex; flex-wrap: wrap; gap: 8px; }
          .skill { background: #DFF5E1; color: #1B7A3D; padding: 4px 8px; border-radius: 4px; font-size: 13px; font-weight: bold; }
          .exp-bullet { margin-bottom: 8px; }
        </style>
      </head>
      <body>
        <h1>${profile.name || 'Candidate Name'}</h1>
        <div class="contact">
          ${profile.phone || ''} | ${profile.email || ''} | ${profile.location || ''}
        </div>
        
        <h2>Professional Summary</h2>
        <p>${tailoredData.summary}</p>
        
        <h2>Top Skills</h2>
        <div class="skills">
          ${tailoredData.skills.map(s => `<span class="skill">${s}</span>`).join('')}
        </div>
        
        <h2>Experience Highlights</h2>
        <ul>
          ${tailoredData.experience_bullets.map(b => `<li class="exp-bullet">${b}</li>`).join('')}
        </ul>
        
        <h2>Education</h2>
        <p>${(tailoredData.education || profile.education_level || '').replace(/\n/g, '<br/>')}</p>
      </body>
    </html>
  `;
}

module.exports = { generatePdfFromHtml, buildResumeHtml };
