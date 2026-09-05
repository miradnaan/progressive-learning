const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { auth } = require('../middleware/auth');

// ── GET /api/quiz/lesson/:lessonId ───────────────────────────────────────────
router.get('/lesson/:lessonId', auth, async (req, res) => {
  try {
    const lessonId = req.params.lessonId;

    const [lessons] = await pool.query('SELECT id, course_id, title FROM lessons WHERE id = ?', [lessonId]);
    if (lessons.length === 0) return res.status(404).json({ error: 'Lesson not found.' });

    const [enrollment] = await pool.query(
      'SELECT 1 FROM enrollments WHERE user_id = ? AND course_id = ?',
      [req.user.id, lessons[0].course_id]
    );
    if (enrollment.length === 0) return res.status(403).json({ error: 'Not enrolled in this course.' });

    const [questions] = await pool.query(
      `SELECT id, question, option_a, option_b, option_c, option_d
       FROM quiz_questions
       WHERE lesson_id = ? AND type = 'lesson'
       ORDER BY RAND()
       LIMIT 4`,
      [lessonId]
    );

    if (questions.length === 0) {
      return res.status(404).json({ error: 'No quiz questions available for this lesson.' });
    }

    const formattedQuestions = questions.map(q => ({
      id: q.id,
      text: q.question,
      question: q.question,
      options: [
        { id: 'a', text: q.option_a },
        { id: 'b', text: q.option_b },
        { id: 'c', text: q.option_c },
        { id: 'd', text: q.option_d }
      ],
      option_a: q.option_a,
      option_b: q.option_b,
      option_c: q.option_c,
      option_d: q.option_d
    }));

    res.json({
      questions: formattedQuestions,
      lesson_title: lessons[0].title,
      lessonTitle: lessons[0].title
    });
  } catch (err) {
    console.error('Error loading lesson quiz:', err);
    res.status(500).json({ error: 'Failed to load quiz.' });
  }
});

// ── POST /api/quiz/lesson/:lessonId/submit ───────────────────────────────────
router.post('/lesson/:lessonId/submit', auth, async (req, res) => {
  try {
    const lessonId = req.params.lessonId;
    const { answers } = req.body;

    if (!answers) {
      return res.status(400).json({ error: 'Answers are required.' });
    }

    const answerMap = {};
    if (Array.isArray(answers)) {
      answers.forEach(a => {
        if (a && a.questionId !== undefined) {
          answerMap[String(a.questionId)] = (a.optionId || '').toLowerCase();
        }
      });
    } else if (typeof answers === 'object') {
      Object.keys(answers).forEach(k => {
        answerMap[String(k)] = String(answers[k] || '').toLowerCase();
      });
    }

    const questionIds = Object.keys(answerMap).map(Number);
    if (questionIds.length === 0) {
      return res.status(400).json({ error: 'No answers provided.' });
    }

    const [correctRows] = await pool.query(
      `SELECT id, correct_option, question, option_a, option_b, option_c, option_d
       FROM quiz_questions
       WHERE id IN (?) AND lesson_id = ? AND type = 'lesson'`,
      [questionIds, lessonId]
    );

    let score = 0;
    const total = correctRows.length;
    const results = correctRows.map(q => {
      const userAnswer = answerMap[String(q.id)]?.toLowerCase();
      const isCorrect = userAnswer === q.correct_option.toLowerCase();
      if (isCorrect) score++;

      const optMap = {
        a: q.option_a,
        b: q.option_b,
        c: q.option_c,
        d: q.option_d
      };

      const userAnswerText = optMap[userAnswer] || userAnswer || 'No answer';
      const correctAnswerText = optMap[q.correct_option.toLowerCase()] || q.correct_option;

      return {
        questionId: q.id,
        question: q.question,
        questionText: q.question,
        correct_option: q.correct_option,
        user_answer: userAnswer || '',
        userAnswerText,
        correctAnswerText,
        is_correct: isCorrect,
        isCorrect,
        option_a: q.option_a,
        option_b: q.option_b,
        option_c: q.option_c,
        option_d: q.option_d
      };
    });

    const passed = total > 0 && (score / total) >= 0.7;

    const [lessonRows] = await pool.query('SELECT course_id, position FROM lessons WHERE id = ?', [lessonId]);
    const courseId = lessonRows[0]?.course_id;
    const currentPosition = lessonRows[0]?.position || 1;

    const [nextRows] = await pool.query(
      'SELECT id FROM lessons WHERE course_id = ? AND position > ? ORDER BY position ASC LIMIT 1',
      [courseId, currentPosition]
    );
    const nextLessonId = nextRows[0]?.id || null;

    await pool.query(
      `INSERT INTO quiz_attempts (user_id, lesson_id, course_id, type, score, total, passed, submitted_at)
       VALUES (?, ?, ?, 'lesson', ?, ?, ?, NOW())`,
      [req.user.id, lessonId, courseId, score, total, passed ? 1 : 0]
    );

    let xpEarned = 0;

    if (passed) {
      const [existingProgress] = await pool.query(
        'SELECT passed_quiz FROM lesson_progress WHERE user_id = ? AND lesson_id = ?',
        [req.user.id, lessonId]
      );

      if (existingProgress.length > 0) {
        await pool.query(
          'UPDATE lesson_progress SET passed_quiz = 1, completed_at = NOW() WHERE user_id = ? AND lesson_id = ?',
          [req.user.id, lessonId]
        );
      } else {
        await pool.query(
          'INSERT INTO lesson_progress (user_id, lesson_id, passed_quiz, completed_at) VALUES (?, ?, 1, NOW())',
          [req.user.id, lessonId]
        );
      }

      const XP_PER_CORRECT_ANSWER = 10;
      const potentialXp = score * XP_PER_CORRECT_ANSWER;

      const [priorXpRows] = await pool.query(
        "SELECT COALESCE(SUM(amount), 0) as total_awarded FROM xp_transactions WHERE user_id = ? AND reason LIKE 'Lesson Quiz Passed%' AND ref_id = ?",
        [req.user.id, lessonId]
      );
      const priorAwarded = Number(priorXpRows[0]?.total_awarded) || 0;

      if (potentialXp > priorAwarded) {
        xpEarned = potentialXp - priorAwarded;
        await pool.query('UPDATE users SET xp = xp + ? WHERE id = ?', [xpEarned, req.user.id]);
        await pool.query(
          'INSERT INTO xp_transactions (user_id, amount, reason, ref_id, created_at) VALUES (?, ?, ?, ?, NOW())',
          [req.user.id, xpEarned, `Lesson Quiz Passed (${score}/${total} correct)`, lessonId]
        );
      }
    }

    const [userRows] = await pool.query('SELECT xp FROM users WHERE id = ?', [req.user.id]);

    res.json({
      score,
      total,
      passed,
      xp_earned: xpEarned,
      new_xp: Number(userRows[0]?.xp) || 0,
      nextLessonId,
      results
    });
  } catch (err) {
    console.error('Error submitting lesson quiz:', err);
    res.status(500).json({ error: 'Failed to submit quiz.' });
  }
});

module.exports = router;
