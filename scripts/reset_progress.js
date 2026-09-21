require('dotenv').config();
const mysql = require('mysql2/promise');

async function resetProgress() {
  const targetEmail = process.argv[2] || 'alex@example.com';
  console.log(`🔄 Resetting progress for user: ${targetEmail}...`);

  const config = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'progressive_learning',
    port: parseInt(process.env.DB_PORT, 10) || 3306
  };

  try {
    const connection = await mysql.createConnection(config);

    // Find user ID
    const [userRows] = await connection.query('SELECT id, name, email FROM users WHERE email = ?', [targetEmail]);
    if (userRows.length === 0) {
      console.error(`❌ User with email "${targetEmail}" not found.`);
      await connection.end();
      process.exit(1);
    }

    const user = userRows[0];
    console.log(`👤 Found user: ${user.name} (ID: ${user.id})`);

    // 1. Clear lesson progress
    const [delProgress] = await connection.query('DELETE FROM lesson_progress WHERE user_id = ?', [user.id]);
    console.log(`   • Cleared ${delProgress.affectedRows} lesson progress records.`);

    // 2. Clear quiz attempts
    const [delAttempts] = await connection.query('DELETE FROM quiz_attempts WHERE user_id = ?', [user.id]);
    console.log(`   • Cleared ${delAttempts.affectedRows} quiz attempts.`);

    // 3. Clear XP transactions
    const [delXp] = await connection.query('DELETE FROM xp_transactions WHERE user_id = ?', [user.id]);
    console.log(`   • Cleared ${delXp.affectedRows} XP transactions.`);

    // 4. Clear enrollments
    const [delEnrollments] = await connection.query('DELETE FROM enrollments WHERE user_id = ?', [user.id]);
    console.log(`   • Cleared ${delEnrollments.affectedRows} course enrollments.`);

    // 5. Reset user XP to 0 and streak to 1
    await connection.query('UPDATE users SET xp = 0, streak = 1 WHERE id = ?', [user.id]);
    console.log('   • Reset XP = 0 and streak = 1.');

    console.log(`\n✅ Successfully reset all progress for ${user.name} (${user.email})!`);
    console.log('🎓 Next time you log in, all lessons will be locked except Lesson 1, and your level will be Beginner (0 XP).');

    await connection.end();
    process.exit(0);
  } catch (err) {
    console.error('❌ Reset failed:', err.message);
    process.exit(1);
  }
}

resetProgress();
