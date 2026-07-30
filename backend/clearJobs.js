// Run this once to clear old low-quality jobs and trigger fresh aggregation
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database(path.join(__dirname, 'db/makdi.db'), async (err) => {
  if (err) { console.error(err); process.exit(1); }
  
  db.run('DELETE FROM jobs', [], function(err) {
    if (err) console.error('Error clearing:', err);
    else console.log(`Cleared ${this.changes} old jobs from database.`);
    db.close();
  });
});
