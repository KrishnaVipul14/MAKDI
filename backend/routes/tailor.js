const express = require('express');
const { tailorResume } = require('../services/tailoringEngine');
const { generatePdfFromHtml, buildResumeHtml } = require('../services/pdfGenerator');

const router = express.Router();

// Session middleware (no JWT)
const sessionMiddleware = async (req, res, next) => {
  const sessionId = req.headers['x-session-id'];
  if (!sessionId) return res.status(400).json({ error: 'Session ID required' });
  const db = req.app.locals.db;
  try {
    const session = await db.get('SELECT * FROM session_resumes WHERE id = ?', [sessionId]);
    if (!session) return res.status(404).json({ error: 'Session not found. Please re-upload your resume.' });
    req.session = session;
    next();
  } catch (err) {
    res.status(500).json({ error: 'Failed to load session' });
  }
};

router.post('/', sessionMiddleware, async (req, res) => {
  const { jobId, mode } = req.body;
  if (!jobId) return res.status(400).json({ error: 'Job ID required' });

  const db = req.app.locals.db;

  try {
    const job = await db.get('SELECT * FROM jobs WHERE id = ?', [jobId]);
    if (!job) return res.status(404).json({ error: 'Job not found' });

    const session = req.session;
    
    // Build a lightweight profile from session data
    const profile = {
      name: 'User',
      email: '',
      phone: '',
      location: '',
      years_experience: session.parsed_experience_years || 0,
      education_level: session.parsed_education || 'Undergrad',
      parsed_skills: session.parsed_skills || '[]'
    };

    // Run the hybrid tailoring engine
    const engineResult = await tailorResume(
      session.parsed_text,
      job.description || '',
      profile,
      mode || 'creative',
      job.title
    );

    // Generate PDF
    const safeTitle = job.title.replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
    const filename = `MAKDI_${safeTitle}_Resume.pdf`;
    const html = buildResumeHtml(profile, engineResult.tailoredData);
    await generatePdfFromHtml(html, filename);

    res.json({
      message: 'Resume tailored successfully',
      pdfUrl: `/uploads/${filename}`,
      tailoredData: engineResult.tailoredData,
      ats_score_before: engineResult.ats_score_before,
      ats_score_after: engineResult.ats_score_after,
      changes_made: engineResult.changes_made,
      keywords_added: engineResult.keywords_added
    });
  } catch (err) {
    console.error('Tailor error:', err);
    res.status(500).json({ error: 'Failed to tailor resume: ' + err.message });
  }
});

module.exports = router;
