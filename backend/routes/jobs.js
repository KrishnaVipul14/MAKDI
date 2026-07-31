const express = require('express');
const { computeCompanyTier, isDuplicateOrBulkPosting } = require('../services/companyCuration');
const natural = require('natural');
const TfIdf = natural.TfIdf;

const router = express.Router();

// Session middleware (no JWT, just reads sessionId from header)
const sessionMiddleware = async (req, res, next) => {
  const sessionId = req.headers['x-session-id'];
  if (!sessionId) return res.status(400).json({ error: 'Session ID required. Please upload your resume first.' });
  
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

function scoreJobForSession(job, sessionSkills, sessionText) {
  if (!sessionText) return 0;
  const tfidf = new TfIdf();
  tfidf.addDocument(job.description || '');
  
  let score = 0;
  const skills = Array.isArray(sessionSkills) ? sessionSkills : JSON.parse(sessionSkills || '[]');
  
  skills.forEach(skill => {
    if ((job.description || '').toLowerCase().includes(skill.toLowerCase())) {
      score += 15;
    }
  });
  
  // Cap at 95
  return Math.min(Math.round(score), 95);
}

router.get('/', sessionMiddleware, async (req, res) => {
  const db = req.app.locals.db;
  const {
    workType,
    experienceLevel,
    educationRequired,
    companyTier,
    postedDate,
    sortBy,
    search
  } = req.query;

  try {
    const rawJobs = await db.all('SELECT * FROM jobs');

    // Apply curation and dedup
    const seen = new Set();
    const curatedJobs = [];
    for (const job of rawJobs) {
      const key = `${job.company}__${job.title}`;
      if (seen.has(key)) continue;
      seen.add(key);
      curatedJobs.push(job);
    }

    // Score each job against the session resume
    const sessionSkills = req.session.parsed_skills || '[]';
    const sessionText = req.session.parsed_text || '';

    let jobs = curatedJobs.map(j => ({
      ...j,
      score: scoreJobForSession(j, sessionSkills, sessionText)
    }));

    // Filters
    jobs = jobs.filter(j => {
      if (search && !j.title?.toLowerCase().includes(search.toLowerCase()) && !j.company?.toLowerCase().includes(search.toLowerCase())) return false;
      if (workType && workType !== 'All' && j.remote_type !== workType) return false;

      if (experienceLevel && experienceLevel !== 'All') {
        let jobLevel = 'Entry-level';
        if (j.min_experience >= 10) jobLevel = 'Lead';
        else if (j.min_experience >= 5) jobLevel = 'Senior';
        else if (j.min_experience >= 2) jobLevel = 'Mid-level';
        if (jobLevel !== experienceLevel) return false;
      }

      if (educationRequired && educationRequired !== 'Any') {
        if (!j.education_required?.toLowerCase().includes(educationRequired.toLowerCase())) return false;
      }

      const tierPref = companyTier || 'standard';
      if (tierPref === 'verified' && j.company_tier !== 'verified') return false;
      if (tierPref === 'standard' && j.company_tier === 'unverified') return false;

      if (postedDate && postedDate !== 'Anytime') {
        const diffHours = (Date.now() - new Date(j.posted_date)) / (1000 * 60 * 60);
        if (postedDate === 'Last 24h' && diffHours > 24) return false;
        if (postedDate === 'Last week' && diffHours > 168) return false;
        if (postedDate === 'Last month' && diffHours > 720) return false;
      }

      return true;
    });

    // Sort
    const sort = sortBy || 'match';
    jobs.sort((a, b) => {
      if (sort === 'match') return (b.score - a.score) || (new Date(b.posted_date) - new Date(a.posted_date));
      if (sort === 'newest') return new Date(b.posted_date) - new Date(a.posted_date);
      if (sort === 'salary') {
        const getSal = s => { const n = (s || '').match(/\d+/g); return n ? Math.max(...n.map(Number)) : 0; };
        return getSal(b.salary_range) - getSal(a.salary_range);
      }
      return 0;
    });

    // Mark new badge
    const now = Date.now();
    jobs = jobs.map(j => ({ ...j, is_new: (now - new Date(j.posted_date)) / 3600000 <= 24 }));

    res.json(jobs);
  } catch (err) {
    console.error('Jobs error:', err);
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
});

module.exports = router;
