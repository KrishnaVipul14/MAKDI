// Quick smoke test — scrape just a few companies and print results
const path = require('path');
require('dotenv').config();
const { open } = require('sqlite');
const sqlite3 = require('sqlite3');
const { aggregateJobs } = require('./services/jobAggregator');

async function main() {
  const db = await open({ filename: path.join(__dirname, 'db/makdi.db'), driver: sqlite3.Database });
  
  // Monkey-patch sources to only scrape 3 companies for this test
  const sources = require('./sources.json');
  const origLever = sources.lever_companies;
  const origGreenhouse = sources.greenhouse_companies;
  sources.lever_companies = origLever.slice(0, 3);
  sources.greenhouse_companies = origGreenhouse.slice(0, 3);

  await aggregateJobs(db);

  const count = await db.get('SELECT COUNT(*) as c FROM jobs');
  const sample = await db.all('SELECT title, company, remote_type, company_tier FROM jobs LIMIT 10');
  console.log('\nTotal jobs in DB:', count.c);
  console.log('Sample:');
  sample.forEach(j => console.log(`  [${j.company_tier}] ${j.company} — ${j.title} (${j.remote_type})`));
  
  await db.close();
}
main().catch(console.error);
