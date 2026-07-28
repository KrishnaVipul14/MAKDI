const cron = require('node-cron');
const sources = require('../sources.json');

// Simple helper to fetch and parse JSON
async function fetchJson(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.error(`Failed to fetch ${url}`, err.message);
    return null;
  }
}

async function aggregateJobs(db) {
  console.log('Starting job aggregation cron...');
  
  let totalSaved = 0;

  // 1. Arbeitnow
  const arbeitData = await fetchJson(sources.arbeitnow);
  if (arbeitData && arbeitData.data) {
    for (const job of arbeitData.data) {
      try {
        await db.run(
          `INSERT OR IGNORE INTO jobs (external_id, source, title, company, location, remote_type, description, apply_url, posted_date)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            job.slug, 'arbeitnow', job.title, job.company_name, job.location, 
            job.remote ? 'Remote' : 'Onsite', job.description, job.url, 
            new Date(job.created_at * 1000).toISOString()
          ]
        );
        totalSaved++;
      } catch(e) {}
    }
  }

  // 2. RemoteOK
  const remoteOkData = await fetchJson(sources.remoteok);
  if (remoteOkData && Array.isArray(remoteOkData)) {
    // first item is usually legal text
    for (let i = 1; i < remoteOkData.length; i++) {
      const job = remoteOkData[i];
      try {
        await db.run(
          `INSERT OR IGNORE INTO jobs (external_id, source, title, company, location, remote_type, description, apply_url, posted_date)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            job.id, 'remoteok', job.position, job.company, job.location, 
            'Remote', job.description, job.url, job.date
          ]
        );
        totalSaved++;
      } catch(e) {}
    }
  }

  // 3. Lever
  for (const company of sources.lever_companies) {
    const data = await fetchJson(`https://api.lever.co/v0/postings/${company}?mode=json`);
    if (data && Array.isArray(data)) {
      for (const job of data) {
        try {
          await db.run(
            `INSERT OR IGNORE INTO jobs (external_id, source, title, company, location, remote_type, description, apply_url, posted_date)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              job.id, 'lever', job.text, company, job.categories?.location || 'Unknown', 
              job.categories?.workplaceTypes?.[0] || 'Unknown', job.description, job.hostedUrl, 
              new Date(job.createdAt).toISOString()
            ]
          );
          totalSaved++;
        } catch(e) {}
      }
    }
  }

  // 4. Greenhouse
  for (const company of sources.greenhouse_companies) {
    const data = await fetchJson(`https://boards-api.greenhouse.io/v1/boards/${company}/jobs`);
    if (data && data.jobs) {
      for (const job of data.jobs) {
        try {
          await db.run(
            `INSERT OR IGNORE INTO jobs (external_id, source, title, company, location, remote_type, apply_url, posted_date)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              job.id, 'greenhouse', job.title, company, job.location?.name || 'Unknown', 
              'Unknown', job.absolute_url, new Date(job.updated_at).toISOString()
            ]
          );
          totalSaved++;
        } catch(e) {}
      }
    }
  }

  console.log(`Job aggregation finished. Attempts: ${totalSaved}.`);
}

function initJobAggregator(db) {
  // Run on startup
  aggregateJobs(db);

  // Run every 4 hours
  cron.schedule('0 */4 * * *', () => {
    aggregateJobs(db);
  });
}

module.exports = { initJobAggregator, aggregateJobs };
