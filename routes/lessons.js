const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { auth, instructorOnly } = require('../middleware/auth');

// ── GET /api/lessons/course/:courseId ─────────────────────────────────────────
// Return all lessons for a course with unlock and progress status for each.
// Unlock logic: position 1 always unlocked. Position N unlocked if position N-1 has passed_quiz=true.
router.get('/course/:courseId', auth, async (req, res) => {
  try {
    const courseId = req.params.courseId;

    const [courseRows] = await pool.query(
      'SELECT id, title, description, category, duration, image_url, xp_cost FROM courses WHERE id = ?',
      [courseId]
    );
    const course = courseRows[0] || { id: courseId, title: 'Course Roadmap' };

    const [lessons] = await pool.query(
      'SELECT id, course_id, position, title, duration_minutes, video_url, content FROM lessons WHERE course_id = ? ORDER BY position ASC',
      [courseId]
    );

    const [progressRows] = await pool.query(
      `SELECT lp.lesson_id, lp.passed_quiz, lp.completed_at
       FROM lesson_progress lp
       JOIN lessons l ON l.id = lp.lesson_id
       WHERE lp.user_id = ? AND l.course_id = ?`,
      [req.user.id, courseId]
    );

    const progressMap = {};
    progressRows.forEach(p => {
      progressMap[p.lesson_id] = p;
    });

    const isInstructorOrAdmin = req.user.role === 'instructor' || req.user.role === 'admin';
    let previousPassed = true; // position 1 is always unlocked
    const enrichedLessons = lessons.map((lesson, idx) => {
      const prog = progressMap[lesson.id];
      const passedQuiz = Boolean(prog && Number(prog.passed_quiz) === 1);
      const completed = Boolean(prog && (prog.completed_at || Number(prog.passed_quiz) === 1));

      const isUnlocked = isInstructorOrAdmin || idx === 0 ? true : previousPassed;
      previousPassed = passedQuiz;

      let status = 'locked';
      if (passedQuiz) {
        status = 'completed';
      } else if (isUnlocked) {
        status = 'unlocked';
      }

      return {
        ...lesson,
        status,
        duration: `${lesson.duration_minutes || 20} mins`,
        orderIndex: lesson.position,
        completed,
        passed_quiz: passedQuiz,
        is_unlocked: isUnlocked
      };
    });

    res.json({ course, lessons: enrichedLessons });
  } catch (err) {
    console.error('Error loading course lessons:', err);
    res.status(500).json({ error: 'Failed to load lessons.' });
  }
});

// ── GET /api/lessons/:id ──────────────────────────────────────────────────────
// Fetch lesson by id with course info, check enrollment and unlock status
router.get('/:id', auth, async (req, res) => {
  try {
    const lessonId = req.params.id;
    const isInstructorOrAdmin = req.user.role === 'instructor' || req.user.role === 'admin';

    // Fetch lesson with course title
    const [lessons] = await pool.query(
      `SELECT l.*, c.title AS course_title
       FROM lessons l
       JOIN courses c ON c.id = l.course_id
       WHERE l.id = ?`,
      [lessonId]
    );

    if (lessons.length === 0) {
      return res.status(404).json({ error: 'Lesson not found.' });
    }
    const lesson = lessons[0];

    // Check enrollment: student must be enrolled in the lesson's course (instructors bypass)
    if (!isInstructorOrAdmin) {
      const [enrollments] = await pool.query(
        'SELECT 1 FROM enrollments WHERE user_id = ? AND course_id = ?',
        [req.user.id, lesson.course_id]
      );
      if (enrollments.length === 0) {
        return res.status(403).json({ error: 'You are not enrolled in this course.' });
      }

      // Check unlock status:
      // lesson position 1 is always unlocked.
      // For position > 1, check if user passed quiz for the previous lesson.
      if (lesson.position > 1) {
        const [prevLessons] = await pool.query(
          'SELECT id FROM lessons WHERE course_id = ? AND position < ? ORDER BY position DESC LIMIT 1',
          [lesson.course_id, lesson.position]
        );

        if (prevLessons.length > 0) {
          const prevLessonId = prevLessons[0].id;
          const [prevProgress] = await pool.query(
            'SELECT passed_quiz FROM lesson_progress WHERE user_id = ? AND lesson_id = ?',
            [req.user.id, prevLessonId]
          );

          if (prevProgress.length === 0 || Number(prevProgress[0].passed_quiz) !== 1) {
            return res.status(403).json({ error: 'Complete the previous lesson quiz first.' });
          }
        }
      }
    }

    // Get previous and next lesson IDs in course
    const [prevRows] = await pool.query(
      'SELECT id FROM lessons WHERE course_id = ? AND position < ? ORDER BY position DESC LIMIT 1',
      [lesson.course_id, lesson.position]
    );
    const [nextRows] = await pool.query(
      'SELECT id FROM lessons WHERE course_id = ? AND position > ? ORDER BY position ASC LIMIT 1',
      [lesson.course_id, lesson.position]
    );

    // Get total lessons for course
    const [totalRows] = await pool.query(
      'SELECT COUNT(*) as total FROM lessons WHERE course_id = ?',
      [lesson.course_id]
    );
    const totalLessons = totalRows[0]?.total || 0;

    // Current lesson progress status
    const [progressRows] = await pool.query(
      'SELECT passed_quiz, completed_at FROM lesson_progress WHERE user_id = ? AND lesson_id = ?',
      [req.user.id, lessonId]
    );
    const prog = progressRows[0];
    const completed = Boolean(prog && (prog.completed_at || Number(prog.passed_quiz) === 1));
    const passedQuiz = Boolean(prog && Number(prog.passed_quiz) === 1);

    const lessonData = {
      ...lesson,
      orderIndex: lesson.position,
      status: passedQuiz ? 'completed' : 'unlocked',
      duration: `${lesson.duration_minutes || 20} mins`,
      completed,
      passed_quiz: passedQuiz
    };

    res.json({
      lesson: lessonData,
      course: {
        id: lesson.course_id,
        title: lesson.course_title
      },
      course_title: lesson.course_title,
      previousId: prevRows[0]?.id || null,
      nextId: nextRows[0]?.id || null,
      total_lessons: totalLessons,
      is_unlocked: true
    });
  } catch (err) {
    console.error('Error loading lesson:', err);
    res.status(500).json({ error: 'Failed to load lesson.' });
  }
});

// ── POST /api/lessons (instructor only) ───────────────────────────────────────
router.post('/', auth, instructorOnly, async (req, res) => {
  try {
    const { course_id, position, title, duration_minutes, duration, content, video_url } = req.body;
    if (!course_id || !title || position === undefined) {
      return res.status(400).json({ error: 'course_id, position, and title are required.' });
    }

    const durationVal = Number(duration_minutes || duration) || 20;

    const [result] = await pool.query(
      `INSERT INTO lessons (course_id, position, title, duration_minutes, content, video_url)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        course_id,
        Number(position),
        title.trim(),
        durationVal,
        content || '',
        video_url || ''
      ]
    );

    // Update lesson_count on course
    await pool.query(
      'UPDATE courses SET lesson_count = (SELECT COUNT(*) FROM lessons WHERE course_id = ?) WHERE id = ?',
      [course_id, course_id]
    );

    const [newLesson] = await pool.query('SELECT * FROM lessons WHERE id = ?', [result.insertId]);
    res.status(201).json({ lesson: newLesson[0], lessonId: result.insertId });
  } catch (err) {
    console.error('Create lesson error:', err);
    res.status(500).json({ error: 'Failed to create lesson.' });
  }
});

// ── PUT /api/lessons/:id (instructor only) ────────────────────────────────────
router.put('/:id', auth, instructorOnly, async (req, res) => {
  try {
    const lessonId = req.params.id;
    const [existing] = await pool.query('SELECT * FROM lessons WHERE id = ?', [lessonId]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Lesson not found.' });
    }
    const current = existing[0];

    const { position, title, duration_minutes, duration, content, video_url } = req.body;
    const durationVal = (duration_minutes !== undefined || duration !== undefined)
      ? Number(duration_minutes || duration)
      : current.duration_minutes;

    await pool.query(
      `UPDATE lessons SET
         position = ?,
         title = ?,
         duration_minutes = ?,
         content = ?,
         video_url = ?
       WHERE id = ?`,
      [
        position !== undefined ? Number(position) : current.position,
        title !== undefined ? title.trim() : current.title,
        durationVal,
        content !== undefined ? content : current.content,
        video_url !== undefined ? video_url : current.video_url,
        lessonId
      ]
    );

    const [updated] = await pool.query('SELECT * FROM lessons WHERE id = ?', [lessonId]);
    res.json({ lesson: updated[0], lessonId: Number(lessonId) });
  } catch (err) {
    console.error('Update lesson error:', err);
    res.status(500).json({ error: 'Failed to update lesson.' });
  }
});

// ── DELETE /api/lessons/:id (instructor only) ─────────────────────────────────
router.delete('/:id', auth, instructorOnly, async (req, res) => {
  try {
    const lessonId = req.params.id;
    const [lessons] = await pool.query('SELECT course_id FROM lessons WHERE id = ?', [lessonId]);
    if (lessons.length === 0) {
      return res.status(404).json({ error: 'Lesson not found.' });
    }
    const courseId = lessons[0].course_id;

    await pool.query('DELETE FROM lessons WHERE id = ?', [lessonId]);

    // Update lesson count on course
    await pool.query(
      'UPDATE courses SET lesson_count = (SELECT COUNT(*) FROM lessons WHERE course_id = ?) WHERE id = ?',
      [courseId, courseId]
    );

    res.json({ success: true });
  } catch (err) {
    console.error('Delete lesson error:', err);
    res.status(500).json({ error: 'Failed to delete lesson.' });
  }
});

module.exports = router;
