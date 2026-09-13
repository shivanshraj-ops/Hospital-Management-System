// import-db.js
// One-time helper: imports database.sql into a Railway MySQL database
// using the mysql2 driver (which supports caching_sha2_password natively,
// unlike the old mysql.exe CLI bundled with XAMPP).
//
// Usage:
//   npm install
//   node import-db.js
//
// Edit the connection details below before running.

const fs = require('fs');
const mysql = require('mysql2/promise');

const config = {
  host: 'interchange.proxy.rlwy.net',
  port: 44708,
  user: 'root',
  password: 'LQMtrIxMIjymWzdzvNISsQDxvRZCzShr',
  database: 'railway',
  multipleStatements: true, // required to run the whole .sql file in one go
};

async function main() {
  console.log('Reading database.sql ...');
  const sql = fs.readFileSync('./database.sql', 'utf8');

  console.log('Connecting to Railway MySQL ...');
  const conn = await mysql.createConnection(config);

  console.log('Running import (this can take a few seconds) ...');
  await conn.query(sql);

  console.log('Done! Verifying tables ...');
  const [rows] = await conn.query('SHOW TABLES');
  console.log(rows);

  await conn.end();
  console.log('Import finished successfully.');
}

main().catch((err) => {
  console.error('Import failed:', err.message);
  process.exit(1);
});
