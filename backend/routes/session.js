const express = require('express');
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const { parseResumeFile } = require('../services/resumeParser');

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../uploads')),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `session_${Date.now()}${ext}`);
  }
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

// POST /api/session/upload
// No auth. Parses resume, returns a session ID + parsed data for the frontend to use.
router.post('/upload', upload.single('resume'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const parsed = await parseResumeFile(req.file.path, req.file.mimetype);
    
    // Generate a unique session ID (stored only in localStorage, no DB account)
    const sessionId = crypto.randomBytes(20).toString('hex');

    // Store session data in DB (lightweight — just resume text + skills, no password)
    const db = req.app.locals.db;
    
    // Ensure session_resumes table exists
    await db.run(`CREATE TABLE IF NOT EXISTS session_resumes (
      id TEXT PRIMARY KEY,
      file_path TEXT,
      parsed_text TEXT,
      parsed_skills TEXT,
      parsed_education TEXT,
      parsed_experience_years REAL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    await db.run(
      `INSERT INTO session_resumes (id, file_path, parsed_text, parsed_skills, parsed_education, parsed_experience_years)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        sessionId,
        req.file.path,
        parsed.parsed_text,
        JSON.stringify(parsed.parsed_skills),
        parsed.parsed_education,
        parsed.parsed_experience_years
      ]
    );

    res.json({
      sessionId,
      parsed_skills: parsed.parsed_skills,
      parsed_education: parsed.parsed_education,
      parsed_experience_years: parsed.parsed_experience_years,
      preview_text: parsed.parsed_text.substring(0, 300)
    });
  } catch (err) {
    console.error('Session upload error:', err);
    res.status(500).json({ error: err.message || 'Failed to parse resume' });
  }
});

// GET /api/session/:id  — fetch session resume data
router.get('/:id', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const session = await db.get('SELECT * FROM session_resumes WHERE id = ?', [req.params.id]);
    if (!session) return res.status(404).json({ error: 'Session not found' });
    res.json(session);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch session' });
  }
});

module.exports = router;
