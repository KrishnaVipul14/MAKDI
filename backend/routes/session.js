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

    // Check if columns exist, if not run migration
    const tableInfo = await db.all("PRAGMA table_info(session_resumes)");
    if (!tableInfo.find(c => c.name === 'structured_json')) {
      await db.exec(`
        ALTER TABLE session_resumes ADD COLUMN structured_json TEXT;
      `);
    }

    await db.run(
      `INSERT INTO session_resumes (id, file_path, parsed_text, structured_json) VALUES (?, ?, ?, ?)`,
      [
        sessionId,
        req.file.path,
        parsed.parsed_text,
        JSON.stringify(parsed.structured_json)
      ]
    );

    res.json({ 
      sessionId, 
      message: 'Resume parsed successfully',
      structured_json: parsed.structured_json
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
