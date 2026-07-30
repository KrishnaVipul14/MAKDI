const express = require('express');
const jwt = require('jsonwebtoken');
const { computeCompanyTier, isDuplicateOrBulkPosting } = require('../services/companyCuration');

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
  const {
    workType, // comma separated
    experienceLevel, // comma separated
    educationRequired,
    yearsExperienceMin,
    yearsExperienceMax,
    salaryMin,
    salaryMax,
    companyTier,
    postedDate,
    sortBy // 'match', 'newest', 'salary'
  } = req.query;
  
  try {
    const rawJobs = await db.all(`
      SELECT j.*, m.score, m.matched_skills, m.missing_skills
      FROM jobs j
      LEFT JOIN match_scores m ON j.id = m.job_id AND m.user_id = ?
    `, [req.user.id]);
    
    // Apply Curation & Dedup
    const curatedJobs = [];
    for (const job of rawJobs) {
      // Extract domain from apply_url
      let domain = "";
      try { domain = new URL(job.apply_url).hostname; } catch(e) {}
      
      const tier = computeCompanyTier(job.company, job, domain);
      job.company_tier = tier; // dynamically compute if not saved properly yet
      
      if (!isDuplicateOrBulkPosting(job, curatedJobs)) {
        curatedJobs.push(job);
      }
    }

    // Apply User Filters
    let jobs = curatedJobs.filter(j => {
      // Work type
      if (workType && workType !== 'All') {
        const types = workType.split(',');
        if (!types.includes(j.remote_type)) return false;
      }
      
      // Experience Level
      if (experienceLevel && experienceLevel !== 'All') {
        const levels = experienceLevel.split(',');
        // Map min_experience to level string
        let jobLevel = 'Entry-level';
        if (j.min_experience >= 10) jobLevel = 'Lead';
        else if (j.min_experience >= 5) jobLevel = 'Senior';
        else if (j.min_experience >= 2) jobLevel = 'Mid-level';
        
        if (!levels.includes(jobLevel)) return false;
      }
      
      // Education
      if (educationRequired && educationRequired !== 'Any' && educationRequired !== 'All') {
        if (!j.education_required?.toLowerCase().includes(educationRequired.toLowerCase())) return false;
      }
      
      // Years Experience Slider
      if (yearsExperienceMin !== undefined && j.min_experience < parseFloat(yearsExperienceMin)) return false;
      if (yearsExperienceMax !== undefined && j.min_experience > parseFloat(yearsExperienceMax)) return false;
      
      // Company Tier
      const tierPref = companyTier || 'standard';
      if (tierPref === 'verified' && j.company_tier !== 'verified') return false;
      if (tierPref === 'standard' && j.company_tier === 'unverified') return false;
      // if 'all', don't filter out unverified
      
      // Posted Date
      if (postedDate && postedDate !== 'Anytime') {
        const now = new Date();
        const posted = new Date(j.posted_date);
        const diffHours = (now - posted) / (1000 * 60 * 60);
        if (postedDate === 'Last 24h' && diffHours > 24) return false;
        if (postedDate === 'Last week' && diffHours > 24 * 7) return false;
        if (postedDate === 'Last month' && diffHours > 24 * 30) return false;
      }
      
      return true;
    });

    // Sorting
    const sort = sortBy || 'match';
    jobs.sort((a, b) => {
      if (sort === 'match') {
        if (b.score !== a.score) return (b.score || 0) - (a.score || 0);
        return new Date(b.posted_date) - new Date(a.posted_date); // tiebreak
      }
      if (sort === 'newest') {
        return new Date(b.posted_date) - new Date(a.posted_date);
      }
      if (sort === 'salary') {
        // extract salary max if available
        const getSalary = str => {
          if (!str) return 0;
          const nums = str.match(/\d+/g);
          return nums ? Math.max(...nums.map(Number)) : 0;
        };
        return getSalary(b.salary_range) - getSalary(a.salary_range);
      }
      return 0;
    });

    // Mark 'New' badge
    const now = new Date();
    jobs = jobs.map(j => {
      const diffHrs = (now - new Date(j.posted_date)) / (1000 * 60 * 60);
      return { ...j, is_new: diffHrs <= 24 };
    });
    
    res.json(jobs);
  } catch (err) {
    console.error('Error fetching jobs:', err);
    res.status(500).json({ error: 'Error fetching jobs' });
  }
});

module.exports = router;
