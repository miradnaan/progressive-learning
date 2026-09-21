const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { auth, optional, instructorOnly } = require('../middleware/auth');

// ── GET /api/courses ─────────────────────────────────────────────────────────
// SELECT all published courses; if user is authenticated, also check enrollment status
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

// ── GET /api/courses/instructor/all ──────────────────────────────────────────
// Returns ALL courses (published + drafts) with lesson counts and student counts
router.get('/instructor/all', auth, instructorOnly, async (req, res) => {
  try {
    const [courses] = await pool.query(`
      SELECT c.*,
             COUNT(DISTINCT l.id) AS lesson_count,
             COUNT(DISTINCT e.user_id) AS student_count
      FROM courses c
      LEFT JOIN lessons l ON l.course_id = c.id
      LEFT JOIN enrollments e ON e.course_id = c.id
      GROUP BY c.id
      ORDER BY c.created_at DESC, c.id DESC
    `);

    const formatted = courses.map(course => ({
      ...course,
      lesson_count: Number(course.lesson_count) || 0,
      student_count: Number(course.student_count) || 0,
      xp_cost: Number(course.xp_cost) || 0,
      cost: Number(course.xp_cost) || 0,
      published: Number(course.published) === 1 ? 1 : 0
    }));

    res.json({ courses: formatted });
  } catch (err) {
    console.error('Error loading instructor courses:', err);
    res.status(500).json({ error: 'Failed to load instructor courses.' });
  }
});

// ── GET /api/courses/:id ─────────────────────────────────────────────────────
// Return course details with lesson list and enrollment status
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
      if (req.user.role === 'instructor' || req.user.role === 'admin') {
        enrolled = true;
      } else {
        const [enrollment] = await pool.query(
          'SELECT 1 FROM enrollments WHERE user_id = ? AND course_id = ?',
          [req.user.id, courseId]
        );
        enrolled = enrollment.length > 0;
      }
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

// ── POST /api/courses/:id/enroll ─────────────────────────────────────────────
// Check if already enrolled, verify XP cost, deduct XP & log transaction, create enrollment
router.post('/:id/enroll', auth, async (req, res) => {
  try {
    const courseId = req.params.id;

    const [courses] = await pool.query('SELECT * FROM courses WHERE id = ?', [courseId]);
    if (courses.length === 0) {
      return res.status(404).json({ error: 'Course not found.' });
    }
    const course = courses[0];

    // Prevent enrollment in draft courses
    if (Number(course.published) !== 1) {
      return res.status(400).json({ error: 'This course is currently in draft mode and unavailable for enrollment.' });
    }

    // Check if already enrolled
    const [existing] = await pool.query(
      'SELECT 1 FROM enrollments WHERE user_id = ? AND course_id = ?',
      [req.user.id, courseId]
    );
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Already enrolled in this course.' });
    }

    // Atomically deduct XP (prevents race condition / double-spend)
    let updatedXp;
    const cost = Number(course.xp_cost) || 0;
    if (cost > 0) {
      const [deductResult] = await pool.query(
        'UPDATE users SET xp = xp - ? WHERE id = ? AND xp >= ?',
        [cost, req.user.id, cost]
      );
      if (deductResult.affectedRows === 0) {
        // Either user not found or insufficient XP
        const [userRows] = await pool.query('SELECT xp FROM users WHERE id = ?', [req.user.id]);
        const currentXp = userRows.length > 0 ? Number(userRows[0].xp) || 0 : 0;
        return res.status(400).json({
          error: 'Insufficient XP',
          needed: cost,
          current: currentXp
        });
      }
      // Get the new XP balance after deduction
      const [balanceRows] = await pool.query('SELECT xp FROM users WHERE id = ?', [req.user.id]);
      updatedXp = Number(balanceRows[0].xp) || 0;

      await pool.query(
        'INSERT INTO xp_transactions (user_id, amount, reason, ref_id, created_at) VALUES (?, ?, ?, ?, NOW())',
        [req.user.id, -cost, `Course Enrollment: ${course.title}`, courseId]
      );
    } else {
      const [userRows] = await pool.query('SELECT xp FROM users WHERE id = ?', [req.user.id]);
      updatedXp = userRows.length > 0 ? Number(userRows[0].xp) || 0 : 0;
    }

    // Create enrollment
    await pool.query(
      'INSERT INTO enrollments (user_id, course_id, enrolled_at) VALUES (?, ?, NOW())',
      [req.user.id, courseId]
    );

    res.json({
      success: true,
      new_xp: updatedXp
    });
  } catch (err) {
    console.error('Enrollment error:', err);
    res.status(500).json({ error: 'Failed to enroll in course.' });
  }
});

// ── POST /api/courses (instructor only) ──────────────────────────────────────
router.post('/', auth, instructorOnly, async (req, res) => {
  try {
    const { title, description, category, duration, image_url, xp_cost, published } = req.body;
    if (!title || !description || !category || !duration) {
      return res.status(400).json({ error: 'Title, description, category, and duration are required.' });
    }

    const [result] = await pool.query(
      `INSERT INTO courses (title, description, category, duration, image_url, lesson_count, published, xp_cost, created_at)
       VALUES (?, ?, ?, ?, ?, 0, ?, ?, NOW())`,
      [
        title.trim(),
        description.trim(),
        category.trim(),
        duration.trim(),
        image_url || '',
        published !== undefined ? (published ? 1 : 0) : 1,
        Number(xp_cost) || 0
      ]
    );

    const [newCourse] = await pool.query('SELECT * FROM courses WHERE id = ?', [result.insertId]);
    res.status(201).json({ course: newCourse[0], courseId: result.insertId });
  } catch (err) {
    console.error('Create course error:', err);
    res.status(500).json({ error: 'Failed to create course.' });
  }
});

// ── PUT /api/courses/:id (instructor only) ───────────────────────────────────
router.put('/:id', auth, instructorOnly, async (req, res) => {
  try {
    const courseId = req.params.id;
    const [courses] = await pool.query('SELECT * FROM courses WHERE id = ?', [courseId]);
    if (courses.length === 0) {
      return res.status(404).json({ error: 'Course not found.' });
    }
    const existing = courses[0];

    const { title, description, category, duration, image_url, published, xp_cost } = req.body;

    await pool.query(
      `UPDATE courses SET
         title = ?,
         description = ?,
         category = ?,
         duration = ?,
         image_url = ?,
         published = ?,
         xp_cost = ?
       WHERE id = ?`,
      [
        title !== undefined ? title : existing.title,
        description !== undefined ? description : existing.description,
        category !== undefined ? category : existing.category,
        duration !== undefined ? duration : existing.duration,
        image_url !== undefined ? image_url : existing.image_url,
        published !== undefined ? (published ? 1 : 0) : existing.published,
        xp_cost !== undefined ? Number(xp_cost) : existing.xp_cost,
        courseId
      ]
    );

    const [updated] = await pool.query('SELECT * FROM courses WHERE id = ?', [courseId]);
    res.json({ course: updated[0] });
  } catch (err) {
    console.error('Update course error:', err);
    res.status(500).json({ error: 'Failed to update course.' });
  }
});

// ── DELETE /api/courses/:id (instructor only) ────────────────────────────────
router.delete('/:id', auth, instructorOnly, async (req, res) => {
  try {
    const courseId = req.params.id;
    await pool.query('DELETE FROM courses WHERE id = ?', [courseId]);
    res.json({ success: true });
  } catch (err) {
    console.error('Delete course error:', err);
    res.status(500).json({ error: 'Failed to delete course.' });
  }
});

// ── PATCH /api/courses/:id/toggle-publish (instructor only) ───────────────────
router.patch('/:id/toggle-publish', auth, instructorOnly, async (req, res) => {
  try {
    const courseId = req.params.id;
    const [courses] = await pool.query('SELECT id, published, title FROM courses WHERE id = ?', [courseId]);
    if (courses.length === 0) {
      return res.status(404).json({ error: 'Course not found.' });
    }

    const currentStatus = Number(courses[0].published) === 1 ? 1 : 0;
    const newStatus = currentStatus === 1 ? 0 : 1;

    await pool.query('UPDATE courses SET published = ? WHERE id = ?', [newStatus, courseId]);

    res.json({
      success: true,
      id: Number(courseId),
      published: newStatus,
      message: newStatus === 1 ? `"${courses[0].title}" is now Published.` : `"${courses[0].title}" moved to Draft.`
    });
  } catch (err) {
    console.error('Toggle publish error:', err);
    res.status(500).json({ error: 'Failed to toggle course publishing status.' });
  }
});

module.exports = router;
