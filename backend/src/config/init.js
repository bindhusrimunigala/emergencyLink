/**
 * Runs on container startup in production.
 * Runs migrations and optionally seeds if DB is empty.
 */
require('dotenv').config();
const pool = require('./db');

const runMigrations = async () => {
  const client = await pool.connect();
  try {
    // Check if tables already exist
    const check = await client.query(
      `SELECT COUNT(*) FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = 'users'`
    );
    const tablesExist = parseInt(check.rows[0].count) > 0;

    if (tablesExist) {
      console.log('✅ Database already initialized, skipping migration.');
      return;
    }

    console.log('🔄 Running database migrations...');
    // Dynamically require migrate to run it
    require('./migrate');
  } catch (err) {
    console.error('❌ Init failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
  }
};

runMigrations();
