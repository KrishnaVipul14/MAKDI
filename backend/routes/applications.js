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

// Get all applications for user
router.get('/', authMiddleware, async (req, res) => {
  const db = req.app.locals.db;
  try {
    const apps = await db.all(`
      SELECT a.*, j.title, j.company, j.location 
      FROM applications a 
      JOIN jobs j ON a.job_id = j.id 
      WHERE a.user_id = ?
      ORDER BY a.applied_at DESC
    `, [req.user.id]);
    res.json(apps);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to get applications' });
  }
});

// Update or create application
router.post('/', authMiddleware, async (req, res) => {
  const { jobId, status, notes } = req.body;
  const db = req.app.locals.db;
  
  try {
    const existing = await db.get('SELECT id FROM applications WHERE user_id = ? AND job_id = ?', [req.user.id, jobId]);
    
    if (existing) {
      await db.run(
        'UPDATE applications SET status = ?, notes = ?, applied_at = CURRENT_TIMESTAMP WHERE id = ?',
        [status, notes || '', existing.id]
      );
    } else {
      await db.run(
        'INSERT INTO applications (user_id, job_id, status, notes, applied_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)',
        [req.user.id, jobId, status, notes || '']
      );
    }
    res.json({ message: 'Application updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update application' });
  }
});

// Track external application
router.post('/track-external', authMiddleware, async (req, res) => {
  const { url, title } = req.body;
  const db = req.app.locals.db;
  
  try {
    // Try to find a matching job in the database based on URL or title
    let job = await db.get('SELECT id FROM jobs WHERE apply_url = ? OR title = ?', [url, title]);
    if (!job) {
      // Create a dummy job entry if it doesn't exist
      const result = await db.run(
        'INSERT INTO jobs (title, company, apply_url) VALUES (?, ?, ?)',
        [title || 'External Job', 'External Company', url]
      );
      job = { id: result.lastID };
    }
    
    // Add to applications
    await db.run(
      'INSERT INTO applications (user_id, job_id, status, applied_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)',
      [req.user.id, job.id, 'Applied']
    );
    
    res.json({ message: 'Tracked successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to track application' });
  }
});

// Get tailored resume for a specific job title
router.get('/tailored', authMiddleware, async (req, res) => {
  const { title } = req.query;
  const db = req.app.locals.db;
  
  try {
    let query = `
      SELECT t.tailored_pdf_path 
      FROM tailored_resumes t
      JOIN jobs j ON t.job_id = j.id
      WHERE t.user_id = ?
    `;
    let params = [req.user.id];
    
    if (title) {
      // Find where job title roughly matches the page title
      query += ` AND ? LIKE '%' || j.title || '%'`;
      params.push(title);
    }
    
    query += ` ORDER BY t.created_at DESC LIMIT 1`;
    
    const tailored = await db.get(query, params);
    
    if (tailored && tailored.tailored_pdf_path) {
      res.json({ pdfUrl: `/uploads/${tailored.tailored_pdf_path}` });
    } else {
      res.json({ pdfUrl: null });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to find tailored resume' });
  }
});

module.exports = router;
