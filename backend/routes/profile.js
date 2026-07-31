const express = require('express');
const router = express.Router();

router.get('/', async (req, res) => {
  const db = req.app.locals.db;
  try {
    const sessions = await db.all('SELECT * FROM session_resumes ORDER BY created_at DESC LIMIT 1');
    if (!sessions.length) return res.status(404).json({ error: 'No resume found' });
    
    const obj = JSON.parse(sessions[0].structured_json);
    
    res.json({
      name: obj.name || '',
      email: obj.contact?.email || '',
      profile: {
        phone: obj.contact?.phone || '',
        location: obj.contact?.location || '',
        linkedin: obj.contact?.linkedin || '',
        github: obj.contact?.github || '',
      }
    });
  } catch (err) {
    console.error('Profile error:', err);
    res.status(500).json({ error: 'Server error fetching profile' });
  }
});

module.exports = router;
