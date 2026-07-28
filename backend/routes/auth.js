const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'makdi-secret-key-123';

// Register User
router.post('/signup', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  const db = req.app.locals.db;

  try {
    const existing = await db.get('SELECT id FROM users WHERE email = ?', [email]);
    if (existing) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    const result = await db.run(
      'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)',
      [name, email, hash]
    );

    const token = jwt.sign({ id: result.lastID, email }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, user: { id: result.lastID, name, email } });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Server error during signup' });
  }
});

// Login User
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  const db = req.app.locals.db;

  try {
    const user = await db.get('SELECT * FROM users WHERE email = ?', [email]);
    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error during login' });
  }
});

module.exports = router;
