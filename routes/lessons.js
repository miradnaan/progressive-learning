const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { auth } = require('../middleware/auth');

// ── GET /api/lessons/course/:courseId ─────────────────────────────────────────
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

    let previousPassed = true; // position 1 is always unlocked
    const enrichedLessons = lessons.map((lesson, idx) => {
      const prog = progressMap[lesson.id];
      const passedQuiz = Boolean(prog && Number(prog.passed_quiz) === 1);
      const completed = Boolean(prog && (prog.completed_at || Number(prog.passed_quiz) === 1));

      const isUnlocked = idx === 0 ? true : previousPassed;
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
router.get('/:id', auth, async (req, res) => {
  try {
    const lessonId = req.params.id;

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

    const [enrollments] = await pool.query(
      'SELECT 1 FROM enrollments WHERE user_id = ? AND course_id = ?',
      [req.user.id, lesson.course_id]
    );
    if (enrollments.length === 0) {
      return res.status(403).json({ error: 'You are not enrolled in this course.' });
    }

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

    const [prevRows] = await pool.query(
      'SELECT id FROM lessons WHERE course_id = ? AND position < ? ORDER BY position DESC LIMIT 1',
      [lesson.course_id, lesson.position]
    );
    const [nextRows] = await pool.query(
      'SELECT id FROM lessons WHERE course_id = ? AND position > ? ORDER BY position ASC LIMIT 1',
      [lesson.course_id, lesson.position]
    );

    const [totalRows] = await pool.query(
      'SELECT COUNT(*) as total FROM lessons WHERE course_id = ?',
      [lesson.course_id]
    );
    const totalLessons = totalRows[0]?.total || 0;

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

module.exports = router;
