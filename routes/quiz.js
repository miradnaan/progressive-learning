const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { auth, instructorOnly } = require('../middleware/auth');

// ── GET /api/quiz/lesson/:lessonId ───────────────────────────────────────────
// Fetch 3 random questions from the lesson pool (never returns correct_option)
router.get('/lesson/:lessonId', auth, async (req, res) => {
  try {
    const lessonId = req.params.lessonId;

    // Verify lesson exists
    const [lessons] = await pool.query('SELECT id, course_id, title FROM lessons WHERE id = ?', [lessonId]);
    if (lessons.length === 0) return res.status(404).json({ error: 'Lesson not found.' });

    // Verify enrollment
    const [enrollment] = await pool.query(
      'SELECT 1 FROM enrollments WHERE user_id = ? AND course_id = ?',
      [req.user.id, lessons[0].course_id]
    );
    if (enrollment.length === 0) return res.status(403).json({ error: 'Not enrolled in this course.' });

    // Fetch 4 random lesson questions
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
// Grade lesson quiz, record attempt, award XP if passed
router.post('/lesson/:lessonId/submit', auth, async (req, res) => {
  try {
    const lessonId = req.params.lessonId;
    const { answers } = req.body;

    if (!answers) {
      return res.status(400).json({ error: 'Answers are required.' });
    }

    // Support both Array: [{ questionId, optionId }] and Object: { [questionId]: optionId }
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

    // Fetch correct answers for submitted question IDs (scoped to this lesson)
    const [correctRows] = await pool.query(
      `SELECT id, correct_option, question, option_a, option_b, option_c, option_d
       FROM quiz_questions
       WHERE id IN (?) AND lesson_id = ? AND type = 'lesson'`,
      [questionIds, lessonId]
    );

    // Calculate score
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

    // Passing threshold: >= 70% (for 4 questions, need 3+ correct)
    const passed = total > 0 && (score / total) >= 0.7;

    // Get lesson & course info
    const [lessonRows] = await pool.query('SELECT course_id, position FROM lessons WHERE id = ?', [lessonId]);
    const courseId = lessonRows[0]?.course_id;
    const currentPosition = lessonRows[0]?.position || 1;

    // Next lesson in course (if any)
    const [nextRows] = await pool.query(
      'SELECT id FROM lessons WHERE course_id = ? AND position > ? ORDER BY position ASC LIMIT 1',
      [courseId, currentPosition]
    );
    const nextLessonId = nextRows[0]?.id || null;

    // Record quiz attempt
    await pool.query(
      `INSERT INTO quiz_attempts (user_id, lesson_id, course_id, type, score, total, passed, submitted_at)
       VALUES (?, ?, ?, 'lesson', ?, ?, ?, NOW())`,
      [req.user.id, lessonId, courseId, score, total, passed ? 1 : 0]
    );

    let xpEarned = 0;
    let finalExamUnlocked = false;

    if (passed) {
      // Check if already passed before
      const [existingProgress] = await pool.query(
        'SELECT passed_quiz FROM lesson_progress WHERE user_id = ? AND lesson_id = ?',
        [req.user.id, lessonId]
      );

      // Mark lesson as passed
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

      // Dynamic XP based on correct answers: 10 XP per correct answer (not fixed 20 XP)
      const XP_PER_CORRECT_ANSWER = 10;
      const potentialXp = score * XP_PER_CORRECT_ANSWER;

      // Check previously awarded XP for this lesson to prevent duplicate XP / allow upgrade if higher score
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

      // Check if ALL lessons in course now have passed_quiz
      if (courseId) {
        const [allLessons] = await pool.query('SELECT id FROM lessons WHERE course_id = ?', [courseId]);
        const [passedLessons] = await pool.query(
          `SELECT lp.lesson_id FROM lesson_progress lp
           JOIN lessons l ON l.id = lp.lesson_id
           WHERE lp.user_id = ? AND l.course_id = ? AND lp.passed_quiz = 1`,
          [req.user.id, courseId]
        );
        finalExamUnlocked = passedLessons.length >= allLessons.length;
      }
    }

    // Get updated user XP
    const [userRows] = await pool.query('SELECT xp FROM users WHERE id = ?', [req.user.id]);

    res.json({
      score,
      total,
      passed,
      xp_earned: xpEarned,
      new_xp: Number(userRows[0]?.xp) || 0,
      final_exam_unlocked: finalExamUnlocked,
      nextLessonId,
      results
    });
  } catch (err) {
    console.error('Error submitting lesson quiz:', err);
    res.status(500).json({ error: 'Failed to submit quiz.' });
  }
});


// ── GET /api/quiz/admin/questions & /api/quiz/questions (instructor only) ──────
// Returns questions with correct options for instructor audit and management
router.get(['/admin/questions', '/questions'], auth, instructorOnly, async (req, res) => {
  try {
    const { course_id, lesson_id, type } = req.query;
    let sql = `
      SELECT q.*, c.title AS course_title, l.title AS lesson_title
      FROM quiz_questions q
      LEFT JOIN courses c ON c.id = q.course_id
      LEFT JOIN lessons l ON l.id = q.lesson_id
      WHERE 1=1
    `;
    const params = [];

    if (course_id) {
      sql += ' AND q.course_id = ?';
      params.push(Number(course_id));
    }
    if (lesson_id) {
      sql += ' AND q.lesson_id = ?';
      params.push(Number(lesson_id));
    }
    if (type) {
      sql += ' AND q.type = ?';
      params.push(type);
    }

    sql += ' ORDER BY q.course_id ASC, q.lesson_id ASC, q.id ASC';

    const [rows] = await pool.query(sql, params);
    // Enrich with options array and correct_answer for frontend convenience
    const enriched = rows.map(r => ({
      ...r,
      quiz_type: r.type,
      question_text: r.question,
      options: [r.option_a, r.option_b, r.option_c, r.option_d],
      correct_answer: r.correct_option
    }));
    res.json({ questions: enriched });
  } catch (err) {
    console.error('Error fetching admin questions:', err);
    res.status(500).json({ error: 'Failed to fetch questions.' });
  }
});

// ── POST /api/quiz/question & /api/quiz/questions (instructor only) ────────────
router.post(['/question', '/questions'], auth, instructorOnly, async (req, res) => {
  try {
    const { course_id, lesson_id, type, quiz_type, question, question_text, options, correct_option, correct_answer } = req.body;

    const finalQuestion = (question || question_text || '').trim();
    const optA = (options && options[0] !== undefined ? options[0] : req.body.option_a || '').trim();
    const optB = (options && options[1] !== undefined ? options[1] : req.body.option_b || '').trim();
    const optC = (options && options[2] !== undefined ? options[2] : req.body.option_c || '').trim();
    const optD = (options && options[3] !== undefined ? options[3] : req.body.option_d || '').trim();
    const finalCorrect = String(correct_option || correct_answer || 'a').trim().toLowerCase();
    const questionType = (quiz_type === 'final' || type === 'final') ? 'final' : 'lesson';

    if (!course_id || !finalQuestion || !optA || !optB || !optC || !optD) {
      return res.status(400).json({ error: 'course_id, question, and all 4 options are required.' });
    }

    if (!['a', 'b', 'c', 'd'].includes(finalCorrect)) {
      return res.status(400).json({ error: 'correct_option must be a, b, c, or d.' });
    }

    const [result] = await pool.query(
      `INSERT INTO quiz_questions (course_id, lesson_id, type, question, option_a, option_b, option_c, option_d, correct_option)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        Number(course_id),
        lesson_id ? Number(lesson_id) : null,
        questionType,
        finalQuestion,
        optA,
        optB,
        optC,
        optD,
        finalCorrect
      ]
    );

    const [newQuestion] = await pool.query('SELECT * FROM quiz_questions WHERE id = ?', [result.insertId]);
    res.status(201).json({ question: newQuestion[0] });
  } catch (err) {
    console.error('Create question error:', err);
    res.status(500).json({ error: 'Failed to create question.' });
  }
});

// ── PUT /api/quiz/question/:id & /api/quiz/questions/:id (instructor only) ─────
router.put(['/question/:id', '/questions/:id'], auth, instructorOnly, async (req, res) => {
  try {
    const questionId = req.params.id;
    const [existing] = await pool.query('SELECT * FROM quiz_questions WHERE id = ?', [questionId]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Question not found.' });
    }
    const current = existing[0];

    const { question, question_text, option_a, option_b, option_c, option_d, options, correct_option, correct_answer, type, quiz_type, lesson_id, course_id } = req.body;

    const finalQuestion = question !== undefined ? question.trim() : (question_text !== undefined ? question_text.trim() : current.question);
    const optA = options && options[0] !== undefined ? options[0].trim() : (option_a !== undefined ? option_a.trim() : current.option_a);
    const optB = options && options[1] !== undefined ? options[1].trim() : (option_b !== undefined ? option_b.trim() : current.option_b);
    const optC = options && options[2] !== undefined ? options[2].trim() : (option_c !== undefined ? option_c.trim() : current.option_c);
    const optD = options && options[3] !== undefined ? options[3].trim() : (option_d !== undefined ? option_d.trim() : current.option_d);

    const rawCorrect = correct_option !== undefined ? correct_option : (correct_answer !== undefined ? correct_answer : current.correct_option);
    const normalizedCorrect = String(rawCorrect).trim().toLowerCase();

    if (!['a', 'b', 'c', 'd'].includes(normalizedCorrect)) {
      return res.status(400).json({ error: 'correct_option must be a, b, c, or d.' });
    }

    const finalType = type !== undefined ? type : (quiz_type !== undefined ? quiz_type : current.type);

    await pool.query(
      `UPDATE quiz_questions SET
         course_id = ?,
         lesson_id = ?,
         type = ?,
         question = ?,
         option_a = ?,
         option_b = ?,
         option_c = ?,
         option_d = ?,
         correct_option = ?
       WHERE id = ?`,
      [
        course_id !== undefined ? Number(course_id) : current.course_id,
        lesson_id !== undefined ? (lesson_id ? Number(lesson_id) : null) : current.lesson_id,
        finalType,
        finalQuestion,
        optA,
        optB,
        optC,
        optD,
        normalizedCorrect,
        questionId
      ]
    );

    const [updated] = await pool.query('SELECT * FROM quiz_questions WHERE id = ?', [questionId]);
    res.json({ question: updated[0] });
  } catch (err) {
    console.error('Update question error:', err);
    res.status(500).json({ error: 'Failed to update question.' });
  }
});

// ── DELETE /api/quiz/question/:id & /api/quiz/questions/:id (instructor only) ──
router.delete(['/question/:id', '/questions/:id'], auth, instructorOnly, async (req, res) => {
  try {
    const questionId = req.params.id;
    await pool.query('DELETE FROM quiz_questions WHERE id = ?', [questionId]);
    res.json({ success: true });
  } catch (err) {
    console.error('Delete question error:', err);
    res.status(500).json({ error: 'Failed to delete question.' });
  }
});

module.exports = router;
