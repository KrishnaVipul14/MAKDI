const express = require('express');
const jwt = require('jsonwebtoken');
const { generateTailoredContent } = require('../services/ollamaClient');
const { generatePdfFromHtml, buildResumeHtml } = require('../services/pdfGenerator');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'makdi-secret-key-123';

const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

router.post('/', authMiddleware, async (req, res) => {
  const { jobId } = req.body;
  if (!jobId) return res.status(400).json({ error: 'Job ID required' });

  const db = req.app.locals.db;

  try {
    const job = await db.get('SELECT * FROM jobs WHERE id = ?', [jobId]);
    const resume = await db.get('SELECT * FROM resumes WHERE user_id = ? AND is_default = 1', [req.user.id]);
    const profile = await db.get(`
      SELECT p.*, u.name, u.email 
      FROM profiles p 
      JOIN users u ON p.user_id = u.id 
      WHERE p.user_id = ?`, 
      [req.user.id]
    );

    if (!job || !resume || !profile) {
      return res.status(400).json({ error: 'Missing job, resume, or profile data' });
    }

    // Call Ollama for Tailored Resume JSON
    const tailoredData = await generateTailoredContent(resume.parsed_text, job.description, 'resume');
    
    // Generate HTML and PDF
    const html = buildResumeHtml(profile, tailoredData);
    const filename = `Makdi_${job.company.replace(/\\s+/g, '')}_${job.title.replace(/\\s+/g, '')}.pdf`;
    const pdfPath = await generatePdfFromHtml(html, filename);

    // Save tailored resume record
    const result = await db.run(
      `INSERT INTO tailored_resumes (user_id, job_id, resume_id, tailored_pdf_path, tailored_text) 
       VALUES (?, ?, ?, ?, ?)`,
      [req.user.id, job.id, resume.id, filename, JSON.stringify(tailoredData)]
    );

    res.json({
      message: 'Resume tailored successfully',
      id: result.lastID,
      pdfUrl: `/uploads/${filename}`,
      tailoredData
    });

  } catch (err) {
    console.error('Tailor error:', err);
    res.status(500).json({ error: 'Failed to tailor resume' });
  }
});

// Cover letter route
router.post('/cover-letter', authMiddleware, async (req, res) => {
  const { jobId } = req.body;
  const db = req.app.locals.db;

  try {
    const job = await db.get('SELECT * FROM jobs WHERE id = ?', [jobId]);
    const resume = await db.get('SELECT * FROM resumes WHERE user_id = ? AND is_default = 1', [req.user.id]);

    if (!job || !resume) return res.status(400).json({ error: 'Missing data' });

    const clData = await generateTailoredContent(resume.parsed_text, job.description, 'cover_letter');

    const result = await db.run(
      'INSERT INTO cover_letters (user_id, job_id, content) VALUES (?, ?, ?)',
      [req.user.id, job.id, clData.cover_letter]
    );

    res.json({ message: 'Cover letter generated', content: clData.cover_letter });
  } catch (err) {
    console.error('Cover letter error:', err);
    res.status(500).json({ error: 'Failed to generate cover letter' });
  }
});

module.exports = router;
