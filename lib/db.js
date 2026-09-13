const mysql = require('mysql2/promise');

let pool;
function bool(v, def=false){ if(v==null||v==='') return def; return /^(1|true|yes)$/i.test(String(v)); }
function getPool() {
  if (pool) return pool;
  const ssl = bool(process.env.DB_SSL, true) ? { rejectUnauthorized: false } : undefined;
  const common = { waitForConnections:true, connectionLimit:5, queueLimit:0, enableKeepAlive:true, ssl };
  if (process.env.DATABASE_URL) pool = mysql.createPool({ uri: process.env.DATABASE_URL, ...common });
  else {
    for (const k of ['DB_HOST','DB_NAME','DB_USER','DB_PASSWORD']) if (!process.env[k]) throw new Error(`Missing environment variable ${k}`);
    pool = mysql.createPool({ host:process.env.DB_HOST, port:Number(process.env.DB_PORT||3306), database:process.env.DB_NAME, user:process.env.DB_USER, password:process.env.DB_PASSWORD, ...common });
  }
  return pool;
}
async function q(sql, params=[]) { const [rows] = await getPool().execute(sql, params); return rows; }
module.exports = { getPool, q };
