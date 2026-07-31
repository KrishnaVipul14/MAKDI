const express = require('express');
const { tailorResumeToTarget } = require('../services/tailoringEngine');
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
    
    // Parse the stored structured JSON
    let originalResumeObject;
    try {
      originalResumeObject = JSON.parse(session.structured_json);
    } catch (e) {
      return res.status(400).json({ error: 'Stored resume is not properly structured. Please re-upload.' });
    }

    // Run the patch-based tailoring engine
    const engineResult = await tailorResumeToTarget(
      originalResumeObject,
      job.description || ''
    );

    // Generate PDF
    const safeJobTitle = job.title.replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
    const safeName = (engineResult.editedResumeObject.name || 'User').replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
    const filename = `${safeName}_${safeJobTitle}_Resume.pdf`;
    
    const html = buildResumeHtml(engineResult.editedResumeObject);
    await generatePdfFromHtml(html, filename);

    res.json({
      message: 'Resume tailored successfully',
      pdfUrl: `/uploads/${filename}`,
      tailoredData: engineResult.editedResumeObject,
      ats_score_before: engineResult.atsScoreBefore,
      ats_score_after: engineResult.atsScoreAfter,
      patches_applied: engineResult.patchesApplied,
      missing_skills: engineResult.missingSkills
    });
  } catch (err) {
    console.error('Tailor error:', err);
    res.status(500).json({ error: 'Failed to tailor resume: ' + err.message });
  }
});

module.exports = router;
