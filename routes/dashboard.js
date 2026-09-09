const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { auth } = require('../middleware/auth');

// ── GET /api/dashboard ───────────────────────────────────────────────────────
router.get('/', auth, async (req, res) => {
  try {
    const userId = req.user.id;

    const [userRows] = await pool.query(
      'SELECT id, name, email, role, avatar_url, xp, streak, last_active FROM users WHERE id = ?',
      [userId]
    );
    if (userRows.length === 0) return res.status(404).json({ error: 'User not found.' });
    const user = userRows[0];

    const xp = Number(user.xp) || 0;
    let level = 'Beginner';
    let nextLevelXp = 200;
    let prevLevelXp = 0;
    if (xp >= 1000) {
      level = 'Expert';
      nextLevelXp = null;
      prevLevelXp = 1000;
    } else if (xp >= 500) {
      level = 'Advanced';
      nextLevelXp = 1000;
      prevLevelXp = 500;
    } else if (xp >= 200) {
      level = 'Intermediate';
      nextLevelXp = 500;
      prevLevelXp = 200;
    }
    const levelProgressPct = nextLevelXp
      ? Math.min(100, Math.max(0, Math.round(((xp - prevLevelXp) / (nextLevelXp - prevLevelXp)) * 100)))
      : 100;
    const xpRemaining = nextLevelXp ? Math.max(0, nextLevelXp - xp) : 0;

    const [enrollments] = await pool.query(
      `SELECT e.course_id, e.is_completed, e.completed_at, e.enrolled_at,
              c.title, c.description, c.category, c.image_url, c.duration
       FROM enrollments e
       JOIN courses c ON c.id = e.course_id
       WHERE e.user_id = ?
       ORDER BY e.enrolled_at DESC`,
      [userId]
    );

    const coursesWithProgress = await Promise.all(enrollments.map(async (e) => {
      const [totalRows] = await pool.query(
        'SELECT COUNT(*) as total FROM lessons WHERE course_id = ?',
        [e.course_id]
      );
      const totalLessons = Number(totalRows[0]?.total) || 0;

      const [completedRows] = await pool.query(
        `SELECT COUNT(*) as completed FROM lesson_progress lp
         JOIN lessons l ON l.id = lp.lesson_id
         WHERE lp.user_id = ? AND l.course_id = ? AND lp.passed_quiz = 1`,
        [userId, e.course_id]
      );
      const completedLessons = Number(completedRows[0]?.completed) || 0;

      const progress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

      return {
        course_id: e.course_id,
        title: e.title,
        description: e.description,
        category: e.category,
        image_url: e.image_url,
        duration: e.duration,
        enrolled_at: e.enrolled_at,
        is_completed: Number(e.is_completed) === 1,
        completed_at: e.completed_at,
        total_lessons: totalLessons,
        completed_lessons: completedLessons,
        progress
      };
    }));

    const activeCourses = coursesWithProgress.filter(c => !c.is_completed);
    const completedCourses = coursesWithProgress.filter(c => c.is_completed);

    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const weeklyActivity = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const [dayCount] = await pool.query(
        'SELECT COUNT(*) as cnt FROM lesson_progress WHERE user_id = ? AND DATE(completed_at) = ?',
        [userId, dateStr]
      );
      weeklyActivity.push({
        day: days[d.getDay()],
        date: dateStr,
        lessons: Number(dayCount[0]?.cnt) || 0
      });
    }

    const [totalLessonsRows] = await pool.query(
      'SELECT COUNT(*) as cnt FROM lesson_progress WHERE user_id = ?',
      [userId]
    );
    const [totalPassedRows] = await pool.query(
      'SELECT COUNT(*) as cnt FROM quiz_attempts WHERE user_id = ? AND passed = 1',
      [userId]
    );

    const [transactions] = await pool.query(
      `SELECT amount, reason, ref_id, created_at
       FROM xp_transactions
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT 10`,
      [userId]
    );

    const stats = {
      xp,
      streak: Number(user.streak) || 0,
      level,
      next_level_xp: nextLevelXp,
      level_progress_pct: levelProgressPct,
      xp_remaining: xpRemaining,
      lessons_completed: Number(totalLessonsRows[0]?.cnt) || 0,
      quizzes_passed: Number(totalPassedRows[0]?.cnt) || 0,
      completedCourses: completedCourses.length
    };

    const formattedActive = activeCourses.map(c => ({
      ...c,
      id: c.course_id,
      totalLessons: c.total_lessons,
      completedLessons: c.completed_lessons
    }));

    const formattedCompleted = completedCourses.map(c => ({
      ...c,
      id: c.course_id,
      totalLessons: c.total_lessons,
      completedLessons: c.completed_lessons
    }));

    res.json({
      stats,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        xp,
        streak: Number(user.streak) || 0,
        level,
        next_level_xp: nextLevelXp,
        level_progress_pct: levelProgressPct,
        xp_remaining: xpRemaining
      },
      weekly_activity: weeklyActivity.map(w => w.lessons),
      weekly_days: weeklyActivity.map(w => w.day),
      weekly_details: weeklyActivity,
      activeCourses: formattedActive,
      active_courses: formattedActive,
      completedCourses: formattedCompleted,
      completed_courses: formattedCompleted,
      total_completed: completedCourses.length,
      recentTransactions: transactions,
      recent_transactions: transactions
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({ error: 'Failed to load dashboard data.' });
  }
});

module.exports = router;
