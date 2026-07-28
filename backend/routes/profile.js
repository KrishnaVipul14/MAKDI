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

router.post('/', authMiddleware, async (req, res) => {
  const db = req.app.locals.db;
  const { phone, location, education_level, years_experience, preferred_roles, preferred_locations, remote_preference, salary_min, salary_max, skills } = req.body;

  try {
    const existing = await db.get('SELECT id FROM profiles WHERE user_id = ?', [req.user.id]);
    
    if (existing) {
      await db.run(
        `UPDATE profiles SET phone=?, location=?, education_level=?, years_experience=?, preferred_roles=?, preferred_locations=?, remote_preference=?, salary_min=?, salary_max=?, skills=? WHERE user_id=?`,
        [phone, location, education_level, years_experience, JSON.stringify(preferred_roles), JSON.stringify(preferred_locations), remote_preference, salary_min, salary_max, JSON.stringify(skills), req.user.id]
      );
    } else {
      await db.run(
        `INSERT INTO profiles (user_id, phone, location, education_level, years_experience, preferred_roles, preferred_locations, remote_preference, salary_min, salary_max, skills) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [req.user.id, phone, location, education_level, years_experience, JSON.stringify(preferred_roles), JSON.stringify(preferred_locations), remote_preference, salary_min, salary_max, JSON.stringify(skills)]
      );
    }
    res.json({ message: 'Profile saved successfully' });
  } catch (err) {
    console.error('Profile error:', err);
    res.status(500).json({ error: 'Server error saving profile' });
  }
});

module.exports = router;
