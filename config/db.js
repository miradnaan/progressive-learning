const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'progressive_learning',
  port: parseInt(process.env.DB_PORT, 10) || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Test the connection on startup and verify required schema migrations
pool.getConnection()
  .then(async (connection) => {
    console.log('✅ Connected to MySQL database successfully.');
    try {
      const [cols] = await connection.query(`
        SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'avatar_url'
      `);
      if (cols.length === 0) {
        await connection.query('ALTER TABLE users ADD COLUMN avatar_url TEXT NULL AFTER role');
        console.log('✅ Added avatar_url column to users table.');
      }
    } catch (migErr) {
      console.error('Migration notice for avatar_url:', migErr.message);
    }
    connection.release();
  })
  .catch((err) => {
    console.error('❌ Database connection failed:', err.message);
  });

module.exports = pool;
