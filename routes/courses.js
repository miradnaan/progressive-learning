const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { auth, optional } = require('../middleware/auth');

// ── GET /api/courses ─────────────────────────────────────────────────────────
router.get('/', optional, async (req, res) => {
  try {
    const [courses] = await pool.query(`
      SELECT c.*, COUNT(l.id) AS lesson_count
      FROM courses c
      LEFT JOIN lessons l ON l.course_id = c.id
      WHERE c.published = 1
      GROUP BY c.id
      ORDER BY c.id ASC
    `);

    let enrolledSet = new Set();
    if (req.user) {
      const [enrollments] = await pool.query(
        'SELECT course_id FROM enrollments WHERE user_id = ?',
        [req.user.id]
      );
      enrollments.forEach(e => enrolledSet.add(e.course_id));
    }

    const coursesWithEnrollment = courses.map(course => ({
      ...course,
      lesson_count: Number(course.lesson_count) || 0,
      xp_cost: Number(course.xp_cost) || 0,
      cost: Number(course.xp_cost) || 0,
      enrolled: enrolledSet.has(course.id)
    }));

    res.json({ courses: coursesWithEnrollment });
  } catch (err) {
    console.error('Error loading courses:', err);
    res.status(500).json({ error: 'Failed to load courses.' });
  }
});

// ── GET /api/courses/:id ─────────────────────────────────────────────────────
router.get('/:id', optional, async (req, res) => {
  try {
    const courseId = req.params.id;
    const [courses] = await pool.query('SELECT * FROM courses WHERE id = ?', [courseId]);

    if (courses.length === 0) {
      return res.status(404).json({ error: 'Course not found.' });
    }

    const course = courses[0];

    const [lessons] = await pool.query(
      'SELECT id, course_id, position, title, duration_minutes, video_url, content FROM lessons WHERE course_id = ? ORDER BY position ASC',
      [courseId]
    );

    let enrolled = false;
    if (req.user) {
      const [enrollment] = await pool.query(
        'SELECT 1 FROM enrollments WHERE user_id = ? AND course_id = ?',
        [req.user.id, courseId]
      );
      enrolled = enrollment.length > 0;
    }

    const courseData = {
      ...course,
      lesson_count: lessons.length,
      xp_cost: Number(course.xp_cost) || 0,
      cost: Number(course.xp_cost) || 0,
      enrolled,
      lessons
    };

    res.json({
      course: courseData,
      lessons,
      enrolled
    });
  } catch (err) {
    console.error('Error loading course details:', err);
    res.status(500).json({ error: 'Failed to load course details.' });
  }
});

module.exports = router;
