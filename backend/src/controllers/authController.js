const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

// POST /api/auth/register
const register = async (req, res, next) => {
  try {
    const { name, email, password, phone, role } = req.body;

    // Only allow patient self-registration; other roles are created by admin
    const allowedSelfRoles = ['patient'];
    if (!allowedSelfRoles.includes(role)) {
      return res.status(403).json({
        success: false,
        message: 'Only patients can self-register. Other roles are created by admin.'
      });
    }

    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ success: false, message: 'Email already registered' });
    }

    const hashed = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO users (name, email, password, phone, role)
       VALUES ($1, $2, $3, $4, $5) RETURNING id, name, email, role, phone, created_at`,
      [name, email, hashed, phone, role]
    );

    const user = result.rows[0];
    const token = generateToken(user);

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: { user, token }
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/login
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1 AND is_active = true',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const token = generateToken(user);

    // Get additional profile data based on role
    let profileData = {};
    if (user.role === 'driver') {
      const amb = await pool.query(
        'SELECT id, vehicle_number, status FROM ambulances WHERE driver_id = $1',
        [user.id]
      );
      profileData.ambulance = amb.rows[0] || null;
    } else if (user.role === 'hospital_staff') {
      const hosp = await pool.query(
        `SELECT h.id, h.name FROM hospitals h
         JOIN hospital_staff hs ON h.id = hs.hospital_id
         WHERE hs.user_id = $1`,
        [user.id]
      );
      profileData.hospital = hosp.rows[0] || null;
    }

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone,
          ...profileData
        },
        token
      }
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/auth/me
const getMe = async (req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT id, name, email, role, phone, is_active, created_at FROM users WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

// PUT /api/auth/change-password
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const result = await pool.query('SELECT password FROM users WHERE id = $1', [req.user.id]);
    const user = result.rows[0];

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect' });
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2', [hashed, req.user.id]);

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (err) {
    next(err);
  }
};

module.exports = { register, login, getMe, changePassword };
