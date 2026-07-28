const natural = require('natural');
const TfIdf = natural.TfIdf;

function calculateSkillOverlap(resumeSkills = [], jobDesc = '') {
  const jd = jobDesc.toLowerCase();
  if (resumeSkills.length === 0) return { percent: 0, matched: [], missing: [] };

  const matched = [];
  // For 'missing', we would ideally need a list of 'required skills' from the JD.
  // Since we only have the raw description, we can extract JD skills using our dictionary.
  const skillsList = require('../skills.json');
  const jdSkills = skillsList.filter(s => jd.includes(s.toLowerCase()));

  jdSkills.forEach(s => {
    if (resumeSkills.some(rs => rs.toLowerCase() === s.toLowerCase())) {
      matched.push(s);
    }
  });

  const missing = jdSkills.filter(s => !matched.includes(s));
  const percent = jdSkills.length > 0 ? (matched.length / jdSkills.length) : 1;

  return { percent, matched, missing };
}

function calculateExperienceScore(resumeExp, jobExp) {
  if (!jobExp) return 1; // if job doesn't specify, perfect match
  if (resumeExp >= jobExp) return 1;
  if (resumeExp >= jobExp - 1) return 0.8;
  if (resumeExp >= jobExp - 2) return 0.5;
  return 0;
}

function calculateTfIdfSimilarity(resumeText, jobText) {
  const tfidf = new TfIdf();
  tfidf.addDocument(resumeText);
  tfidf.addDocument(jobText);
  // simplified similarity measure for demonstration
  let similarity = 0;
  tfidf.listTerms(0).forEach((item) => {
    tfidf.listTerms(1).forEach((jItem) => {
      if(item.term === jItem.term) {
        similarity += (item.tfidf * jItem.tfidf);
      }
    });
  });
  // Normalize
  return Math.min(similarity / 100, 1);
}

async function runMatchScorerForUser(db, userId) {
  try {
    const resume = await db.get('SELECT * FROM resumes WHERE user_id = ? AND is_default = 1', [userId]);
    if (!resume) return;

    const profile = await db.get('SELECT * FROM profiles WHERE user_id = ?', [userId]);
    const jobs = await db.all('SELECT * FROM jobs');

    const resumeSkills = JSON.parse(resume.parsed_skills || '[]');

    for (const job of jobs) {
      const { percent: skillOverlap, matched, missing } = calculateSkillOverlap(resumeSkills, job.description);
      
      const expScore = calculateExperienceScore(
        resume.parsed_experience_years || 0,
        job.min_experience || 0
      );

      // Simple text similarity bonus
      const textSim = calculateTfIdfSimilarity(resume.parsed_text || '', job.description || '');
      
      // Compute final score 0-100
      // Combining the formula specified by the prompt + tfidf signal
      const baseScore = (skillOverlap * 0.5) + (expScore * 0.2) + (textSim * 0.15) + (0.15); // defaulting location to 0.15 for now
      const finalScore = Math.min(Math.round(baseScore * 100), 100);

      // Insert or update score
      const existing = await db.get('SELECT id FROM match_scores WHERE user_id = ? AND job_id = ?', [userId, job.id]);
      if (existing) {
        await db.run(
          'UPDATE match_scores SET score = ?, matched_skills = ?, missing_skills = ?, computed_at = CURRENT_TIMESTAMP WHERE id = ?',
          [finalScore, JSON.stringify(matched), JSON.stringify(missing), existing.id]
        );
      } else {
        await db.run(
          'INSERT INTO match_scores (user_id, job_id, score, matched_skills, missing_skills) VALUES (?, ?, ?, ?, ?)',
          [userId, job.id, finalScore, JSON.stringify(matched), JSON.stringify(missing)]
        );
      }
    }
    console.log(`Matched ${jobs.length} jobs for user ${userId}`);
  } catch (err) {
    console.error('Match scorer error:', err);
  }
}

module.exports = { runMatchScorerForUser };
