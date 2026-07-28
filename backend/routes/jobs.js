const express = require('express');
const jwt = require('jsonwebtoken');

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

router.get('/', authMiddleware, async (req, res) => {
  const db = req.app.locals.db;
  
  try {
    // Get jobs and join with match scores for this user
    const jobs = await db.all(`
      SELECT j.*, m.score, m.matched_skills, m.missing_skills
      FROM jobs j
      LEFT JOIN match_scores m ON j.id = m.job_id AND m.user_id = ?
      ORDER BY m.score DESC NULLS LAST, j.posted_date DESC
    `, [req.user.id]);
    
    res.json(jobs);
  } catch (err) {
    console.error('Error fetching jobs:', err);
    res.status(500).json({ error: 'Error fetching jobs' });
  }
});

module.exports = router;
