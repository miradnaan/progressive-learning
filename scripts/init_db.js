require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

async function initDatabase() {
  console.log('🔄 Initializing Progressive Learning Database...');

  const config = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    multipleStatements: true
  };

  try {
    console.log(`📡 Connecting to MySQL server at ${config.host}:${config.port} as user "${config.user}"...`);
    const connection = await mysql.createConnection(config);

    const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
    console.log(`📖 Reading schema file from: ${schemaPath}`);
    const sql = fs.readFileSync(schemaPath, 'utf8');

    console.log('⚡ Executing schema.sql (creating database, tables, and seeding data)...');
    await connection.query(sql);

    console.log('✅ Database progressive_learning created and seeded successfully!');
    console.log('🎓 Sample accounts ready:');
    console.log('   - Student:    alex@example.com / password123');
    console.log('   - Instructor: instructor@example.com / password123');

    await connection.end();
    process.exit(0);
  } catch (err) {
    const isConnRefused = err.code === 'ECONNREFUSED' || (err.errors && err.errors.some(e => e.code === 'ECONNREFUSED'));
    
    console.error('\n❌ Database initialization failed:');
    if (isConnRefused) {
      console.error('👉 Connection Refused (ECONNREFUSED) on port ' + config.port + ': MySQL server is NOT running.');
    } else {
      console.error(err.message || err.code || err);
    }
    console.log('\n💡 How to fix:');
    console.log('1. If using Homebrew: brew install mysql && brew services start mysql');
    console.log('2. If using XAMPP: Open XAMPP and click "Start" next to MySQL');
    console.log('3. If MySQL is already running on another port or user, update .env (DB_HOST, DB_USER, DB_PASS, DB_PORT)\n');
    process.exit(1);
  }
}

initDatabase();
