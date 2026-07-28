const express = require('express');
const multer = require('multer');
const path = require('path');
const jwt = require('jsonwebtoken');
const { parseResumeFile } = require('../services/resumeParser');
const { runMatchScorerForUser } = require('../services/matchScorer');
const fs = require('fs');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'makdi-secret-key-123';

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage });

// Middleware to verify JWT
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

router.post('/upload', authMiddleware, upload.single('resume'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const db = req.app.locals.db;

  try {
    const parsedData = await parseResumeFile(req.file.path, req.file.mimetype);

    // Save to DB
    const result = await db.run(
      `INSERT INTO resumes 
        (user_id, file_path, parsed_text, parsed_skills, parsed_education, parsed_experience_years, is_default) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.id,
        req.file.path,
        parsedData.parsed_text,
        JSON.stringify(parsedData.parsed_skills),
        parsedData.parsed_education,
        parsedData.parsed_experience_years,
        1
      ]
    );

    // Run match scoring async
    runMatchScorerForUser(db, req.user.id);

    res.json({ 
      message: 'Resume parsed successfully', 
      resumeId: result.lastID,
      parsedData 
    });
  } catch (err) {
    console.error('Resume parse error:', err);
    res.status(500).json({ error: err.message || 'Error processing resume' });
  }
});

module.exports = router;
