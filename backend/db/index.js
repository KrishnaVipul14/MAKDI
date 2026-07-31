const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const path = require('path');
const fs = require('fs');

async function getDb() {
  const dbPath = path.join(__dirname, 'makdi.db');
  const schemaPath = path.join(__dirname, 'schema.sql');
  const isNewDb = !fs.existsSync(dbPath);

  const db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  // Always run schema — all tables use IF NOT EXISTS so it's safe on existing DBs
  if (fs.existsSync(schemaPath)) {
    const schema = fs.readFileSync(schemaPath, 'utf8');
    await db.exec(schema);
  }

  return db;
}

module.exports = { getDb };
