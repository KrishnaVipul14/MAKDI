const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'db/makdi.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.run("ALTER TABLE jobs ADD COLUMN company_tier TEXT DEFAULT 'unverified';", (err) => {
    if (err) {
      if (err.message.includes('duplicate column name')) {
        console.log('Column already exists.');
      } else {
        console.error('Error adding column:', err.message);
      }
    } else {
      console.log('Successfully added company_tier column.');
    }
  });
});

db.close();
