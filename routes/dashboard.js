const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { auth, instructorOnly } = require('../middleware/auth');

// ── GET /api/dashboard ───────────────────────────────────────────────────────
// Returns user stats, enrolled courses with progress, and recent XP log
router.get('/', auth, async (req, res) => {
  try {
    const userId = req.user.id;

    // 1. User stats
    const [userRows] = await pool.query(
      'SELECT id, name, email, role, avatar_url, xp, streak, last_active FROM users WHERE id = ?',
      [userId]
    );
    if (userRows.length === 0) return res.status(404).json({ error: 'User not found.' });
    const user = userRows[0];

    // Calculate level progression
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

    // 2. Enrolled courses with progress
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
      // Count total lessons in course
      const [totalRows] = await pool.query(
        'SELECT COUNT(*) as total FROM lessons WHERE course_id = ?',
        [e.course_id]
      );
      const totalLessons = Number(totalRows[0]?.total) || 0;

      // Count completed lessons (passed quiz)
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

    // Separate active and completed courses
    const activeCourses = coursesWithProgress.filter(c => !c.is_completed);
    const completedCourses = coursesWithProgress.filter(c => c.is_completed);

    // 3. Weekly activity (last 7 days lessons completed)
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

    // 4. Total lessons completed & quizzes passed
    const [totalLessonsRows] = await pool.query(
      'SELECT COUNT(*) as cnt FROM lesson_progress WHERE user_id = ?',
      [userId]
    );
    const [totalPassedRows] = await pool.query(
      'SELECT COUNT(*) as cnt FROM quiz_attempts WHERE user_id = ? AND passed = 1',
      [userId]
    );

    // 5. Recent XP transactions (last 10)
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

// ── GET /api/dashboard/instructor (instructor only) ──────────────────────────
// Aggregated stats, course performance, lesson dropoff analytics, and recent students
router.get('/instructor', auth, instructorOnly, async (req, res) => {
  try {
    // 1. Core platform metrics
    const [totalStudents] = await pool.query("SELECT COUNT(*) AS count FROM users WHERE role = 'student'");
    const [courseCounts] = await pool.query(`
      SELECT COUNT(*) AS total_courses,
             COALESCE(SUM(CASE WHEN published = 1 THEN 1 ELSE 0 END), 0) AS published_courses,
             COALESCE(SUM(CASE WHEN published = 0 THEN 1 ELSE 0 END), 0) AS draft_courses
      FROM courses
    `);
    const [totalEnrollments] = await pool.query('SELECT COUNT(*) AS total_enrollments FROM enrollments');
    const [avgQuizScore] = await pool.query('SELECT COALESCE(ROUND(AVG(score / total * 100)), 0) AS avg_score FROM quiz_attempts');
    const [avgCompletionRows] = await pool.query(
      'SELECT COALESCE(ROUND(AVG(CASE WHEN is_completed = 1 THEN 100 ELSE 0 END)), 0) AS avg_comp FROM enrollments'
    );

    // 2. Course performance breakdown using independent subqueries (avoids Cartesian products)
    const [courses] = await pool.query(`
      SELECT c.id, c.title, c.category, c.published, c.duration, c.xp_cost, c.image_url,
             (SELECT COUNT(DISTINCT e.user_id) FROM enrollments e WHERE e.course_id = c.id) AS student_count,
             (SELECT COUNT(DISTINCT l.id) FROM lessons l WHERE l.course_id = c.id) AS lesson_count,
             COALESCE((
               SELECT ROUND(AVG(CASE WHEN e.is_completed = 1 THEN 100 ELSE 0 END))
               FROM enrollments e WHERE e.course_id = c.id
             ), 0) AS completion_rate,
             COALESCE((
               SELECT ROUND(AVG(qa.score / qa.total * 100))
               FROM quiz_attempts qa WHERE qa.course_id = c.id
             ), 0) AS avg_score
      FROM courses c
      ORDER BY c.created_at DESC, c.id DESC
    `);

    // 3. Lesson Completion / Dropoff Analytics for selected course
    let targetCourseId = req.query.course_id ? parseInt(req.query.course_id) : null;
    if (!targetCourseId && courses.length > 0) {
      // Default to the first course with lessons, or first course
      const courseWithLessons = courses.find(c => Number(c.lesson_count) > 0);
      targetCourseId = courseWithLessons ? courseWithLessons.id : courses[0].id;
    }

    let lessonDropoff = [];
    let selectedCourseTitle = '';

    if (targetCourseId) {
      const selectedCourse = courses.find(c => c.id === targetCourseId);
      selectedCourseTitle = selectedCourse ? selectedCourse.title : '';

      const [lessons] = await pool.query(
        'SELECT id, position, title, duration_minutes FROM lessons WHERE course_id = ? ORDER BY position ASC',
        [targetCourseId]
      );

      const [enrolledRows] = await pool.query(
        'SELECT COUNT(DISTINCT user_id) as cnt FROM enrollments WHERE course_id = ?',
        [targetCourseId]
      );
      const totalEnrolled = Number(enrolledRows[0]?.cnt) || 0;

      lessonDropoff = await Promise.all(lessons.map(async (l) => {
        const [compRows] = await pool.query(
          `SELECT COUNT(DISTINCT lp.user_id) as cnt
           FROM lesson_progress lp
           WHERE lp.lesson_id = ? AND (lp.passed_quiz = 1 OR lp.completed_at IS NOT NULL)`,
          [l.id]
        );
        const completedCount = Number(compRows[0]?.cnt) || 0;
        const pct = totalEnrolled > 0 ? Math.round((completedCount / totalEnrolled) * 100) : 0;

        return {
          lesson_id: l.id,
          position: l.position,
          title: l.title,
          lesson: `L${l.position}`,
          completed_count: completedCount,
          enrolled_count: totalEnrolled,
          pct: totalEnrolled > 0 ? Math.min(100, pct) : 0
        };
      }));
    }

    // 4. Recent active students
    const [recentStudents] = await pool.query(`
      SELECT u.id, u.name, u.email, u.avatar_url, u.last_active, u.xp, u.streak,
             COUNT(DISTINCT e.course_id) AS enrolled_courses_count,
             COALESCE(ROUND(AVG(CASE WHEN e.is_completed = 1 THEN 100 ELSE 0 END)), 0) as avg_progress
      FROM users u
      LEFT JOIN enrollments e ON e.user_id = u.id
      WHERE u.role = 'student'
      GROUP BY u.id
      ORDER BY u.last_active DESC, u.id DESC
      LIMIT 10
    `);

    res.json({
      stats: {
        total_students: Number(totalStudents[0]?.count) || 0,
        total_courses: Number(courseCounts[0]?.total_courses) || 0,
        published_courses: Number(courseCounts[0]?.published_courses) || 0,
        draft_courses: Number(courseCounts[0]?.draft_courses) || 0,
        active_courses: Number(courseCounts[0]?.published_courses) || 0,
        total_enrollments: Number(totalEnrollments[0]?.total_enrollments) || 0,
        avg_completion: Number(avgCompletionRows[0]?.avg_comp) || 0,
        avg_quiz_score: Number(avgQuizScore[0]?.avg_score) || 0,
        student_trend: '+12%',
        completion_trend: '+5%'
      },
      courses: courses.map(c => ({
        ...c,
        student_count: Number(c.student_count) || 0,
        lesson_count: Number(c.lesson_count) || 0,
        completion_rate: Number(c.completion_rate) || 0,
        avg_score: Number(c.avg_score) || 0,
        published: Number(c.published) === 1 ? 1 : 0
      })),
      selected_course_id: targetCourseId,
      selected_course_title: selectedCourseTitle,
      lesson_dropoff: lessonDropoff,
      recent_students: recentStudents.map(s => ({
        ...s,
        enrolled_courses: Number(s.enrolled_courses_count) || 0,
        enrolled_courses_count: Number(s.enrolled_courses_count) || 0,
        avg_progress: Number(s.avg_progress) || 0
      }))
    });
  } catch (err) {
    console.error('Instructor dashboard error:', err);
    res.status(500).json({ error: 'Failed to load instructor dashboard data.' });
  }
});

module.exports = router;

