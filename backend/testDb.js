require('dotenv').config();
const { getDb } = require('./db');

getDb().then(async db => {
  const tables = await db.all("SELECT name FROM sqlite_master WHERE type='table'");
  console.log('Tables:', tables.map(t => t.name).join(', '));

  const sr = tables.find(t => t.name === 'session_resumes');
  console.log('session_resumes exists:', sr ? 'YES' : 'NO');

  if (sr) {
    await db.run(
      'INSERT OR IGNORE INTO session_resumes (id, parsed_text, parsed_skills, parsed_education, parsed_experience_years) VALUES (?, ?, ?, ?, ?)',
      ['test-123', 'React developer', JSON.stringify(['React']), 'Undergrad', 2]
    );
    const s = await db.get('SELECT * FROM session_resumes WHERE id = ?', ['test-123']);
    console.log('Session insert+retrieve:', s ? 'OK' : 'FAIL');
  }

  await db.close();
}).catch(e => console.error('ERROR:', e.message));
