const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const auth = require('../middleware/auth');

/**
 * Generate JWT token signed with user id, email, and role
 */
function signToken(user) {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not set. Cannot sign tokens.');
  }
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    secret,
    { expiresIn: '7d' }
  );
}

// ── POST /api/auth/register ──────────────────────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, invite_code } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }

    // Instructor registration requires a valid invite code
    let assignedRole = 'student';
    if (role === 'instructor') {
      const inviteKey = process.env.INSTRUCTOR_INVITE_CODE;
      if (!inviteKey || invite_code !== inviteKey) {
        return res.status(403).json({ error: 'Valid instructor invite code is required to register as an instructor.' });
      }
      assignedRole = 'instructor';
    }
    const normalizedEmail = email.toLowerCase().trim();

    // Check if email already exists
    const [existing] = await pool.query(
      'SELECT id FROM users WHERE email = ?',
      [normalizedEmail]
    );
    if (existing.length > 0) {
      return res.status(400).json({ error: 'An account with this email already exists.' });
    }

    // Hash password with 10 salt rounds
    const password_hash = await bcrypt.hash(password, 10);

    // Insert new user
    const [result] = await pool.query(
      'INSERT INTO users (name, email, password_hash, role, xp, streak, last_active) VALUES (?, ?, ?, ?, 0, 0, NOW())',
      [name.trim(), normalizedEmail, password_hash, assignedRole]
    );

    const user = {
      id: result.insertId,
      name: name.trim(),
      email: normalizedEmail,
      role: assignedRole,
      xp: 0,
      streak: 0
    };

    const token = signToken(user);
    res.status(201).json({ token, user });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

// ── POST /api/auth/login ─────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const [rows] = await pool.query(
      'SELECT * FROM users WHERE email = ?',
      [normalizedEmail]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const user = rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // Update streak logic
    // - If last_active is today: keep streak
    // - If last_active is yesterday: streak + 1
    // - If last_active is older: streak = 1
    // - Update last_active to today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let newStreak = user.streak || 0;
    if (user.last_active) {
      const lastActive = new Date(user.last_active);
      lastActive.setHours(0, 0, 0, 0);
      const diffDays = Math.round((today.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays === 0) {
        newStreak = user.streak || 1;
      } else if (diffDays === 1) {
        newStreak = (user.streak || 0) + 1;
      } else {
        newStreak = 1;
      }
    } else {
      newStreak = 1;
    }

    await pool.query(
      'UPDATE users SET streak = ?, last_active = NOW() WHERE id = ?',
      [newStreak, user.id]
    );

    const publicUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar_url: user.avatar_url || null,
      xp: Number(user.xp) || 0,
      streak: newStreak
    };

    const token = signToken(publicUser);
    res.json({ token, user: publicUser });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

// ── GET /api/auth/me ─────────────────────────────────────────────────────────
router.get('/me', auth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, name, email, role, avatar_url, xp, streak, last_active, created_at FROM users WHERE id = ?',
      [req.user.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    res.json({ user: rows[0] });
  } catch (err) {
    console.error('Fetch profile error:', err);
    res.status(500).json({ error: 'Failed to load user profile.' });
  }
});


module.exports = router;
