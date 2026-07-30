const cron = require('node-cron');
const sources = require('../sources.json');
const { computeCompanyTier } = require('./companyCuration');

async function fetchJson(url) {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'MAKDI Job Aggregator/1.0' },
      signal: AbortSignal.timeout(10000)
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    // silent — don't crash the whole run if one source fails
    return null;
  }
}

function parseExperienceFromText(text = '') {
  const match = text.match(/(\d+)\+?\s*(?:to\s*\d+)?\s*years?/i);
  return match ? parseInt(match[1]) : 0;
}

function inferRemoteType(text = '', location = '') {
  const combined = (text + ' ' + location).toLowerCase();
  if (/\bremote\b/.test(combined)) return 'Remote';
  if (/\bhybrid\b/.test(combined)) return 'Hybrid';
  return 'Onsite';
}

async function upsertJob(db, jobData, tier) {
  try {
    await db.run(
      `INSERT OR IGNORE INTO jobs 
        (external_id, source, title, company, location, remote_type, description, apply_url, posted_date, min_experience, company_tier)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        jobData.external_id,
        jobData.source,
        jobData.title,
        jobData.company,
        jobData.location,
        jobData.remote_type,
        jobData.description || '',
        jobData.apply_url,
        jobData.posted_date,
        jobData.min_experience || 0,
        tier
      ]
    );
  } catch (e) {
    // silent — likely a schema mismatch on a fresh run
  }
}

async function scrapeLever(db, companySlug) {
  const data = await fetchJson(`https://api.lever.co/v0/postings/${companySlug}?mode=json`);
  if (!data || !Array.isArray(data)) return 0;

  // Real company display name from first posting
  const companyName = data[0]?.company || companySlug;
  const tier = computeCompanyTier(companyName, { source: 'lever', description: data[0]?.descriptionPlain || '' }, '');

  let count = 0;
  for (const job of data) {
    const descText = job.descriptionPlain || job.description || '';
    await upsertJob(db, {
      external_id: job.id,
      source: 'lever',
      title: job.text,
      company: job.company || companySlug,
      location: job.categories?.location || 'Anywhere',
      remote_type: inferRemoteType(descText, job.categories?.location || ''),
      description: descText.substring(0, 3000),
      apply_url: job.hostedUrl,
      posted_date: new Date(job.createdAt).toISOString(),
      min_experience: parseExperienceFromText(descText)
    }, tier);
    count++;
  }
  return count;
}

async function scrapeGreenhouse(db, companySlug) {
  const data = await fetchJson(`https://boards-api.greenhouse.io/v1/boards/${companySlug}/jobs?content=true`);
  if (!data || !data.jobs) return 0;

  const companyName = data.company?.name || companySlug;
  const tier = computeCompanyTier(companyName, { source: 'greenhouse', description: '' }, '');

  let count = 0;
  for (const job of data.jobs) {
    const descText = (job.content || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    await upsertJob(db, {
      external_id: String(job.id),
      source: 'greenhouse',
      title: job.title,
      company: companyName,
      location: job.location?.name || 'Unknown',
      remote_type: inferRemoteType(descText, job.location?.name || ''),
      description: descText.substring(0, 3000),
      apply_url: job.absolute_url,
      posted_date: new Date(job.updated_at || job.created_at || Date.now()).toISOString(),
      min_experience: parseExperienceFromText(descText)
    }, tier);
    count++;
  }
  return count;
}

async function aggregateJobs(db) {
  console.log(`[${new Date().toISOString()}] Job aggregation starting...`);
  let total = 0;

  // Lever companies
  for (const slug of sources.lever_companies) {
    const count = await scrapeLever(db, slug);
    if (count > 0) console.log(`  [Lever] ${slug}: ${count} jobs`);
  }

  // Greenhouse companies
  for (const slug of sources.greenhouse_companies) {
    const count = await scrapeGreenhouse(db, slug);
    if (count > 0) console.log(`  [Greenhouse] ${slug}: ${count} jobs`);
  }

  console.log(`[${new Date().toISOString()}] Aggregation done.`);
}

function initJobAggregator(db) {
  // Run immediately on startup
  aggregateJobs(db).catch(console.error);

  // Re-run every 4 hours
  cron.schedule('0 */4 * * *', () => {
    aggregateJobs(db).catch(console.error);
  });
}

module.exports = { initJobAggregator, aggregateJobs };
