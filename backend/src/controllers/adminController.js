const bcrypt = require('bcryptjs');
const pool = require('../config/db');

// GET /api/admin/dashboard
const getDashboard = async (req, res, next) => {
  try {
    const [emergencies, ambulances, hospitals, users] = await Promise.all([
      pool.query(`
        SELECT
          COUNT(*) FILTER (WHERE status NOT IN ('completed', 'cancelled')) as active,
          COUNT(*) FILTER (WHERE status = 'completed') as completed,
          COUNT(*) FILTER (WHERE status = 'pending') as pending,
          COUNT(*) FILTER (WHERE priority = 'critical' AND status NOT IN ('completed','cancelled')) as critical_active,
          COUNT(*) as total
        FROM emergency_requests
      `),
      pool.query(`
        SELECT
          COUNT(*) FILTER (WHERE status = 'available') as available,
          COUNT(*) FILTER (WHERE status IN ('dispatched','en_route','at_scene','transporting')) as on_duty,
          COUNT(*) FILTER (WHERE status = 'maintenance') as maintenance,
          COUNT(*) as total
        FROM ambulances WHERE is_active = true
      `),
      pool.query(`
        SELECT COUNT(*) as total, SUM(available_beds) as total_available_beds
        FROM hospitals WHERE is_active = true
      `),
      pool.query(`
        SELECT
          COUNT(*) FILTER (WHERE role = 'patient') as patients,
          COUNT(*) FILTER (WHERE role = 'driver') as drivers,
          COUNT(*) FILTER (WHERE role = 'hospital_staff') as hospital_staff,
          COUNT(*) as total
        FROM users WHERE is_active = true
      `)
    ]);

    res.json({
      success: true,
      data: {
        emergencies: emergencies.rows[0],
        ambulances: ambulances.rows[0],
        hospitals: hospitals.rows[0],
        users: users.rows[0]
      }
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/admin/users
const getUsers = async (req, res, next) => {
  try {
    const { role, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    const params = [];
    let where = 'WHERE 1=1';

    if (role) {
      params.push(role);
      where += ` AND role = $${params.length}`;
    }

    params.push(limit, offset);
    const result = await pool.query(
      `SELECT id, name, email, role, phone, is_active, created_at
       FROM users ${where}
       ORDER BY created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
};

// POST /api/admin/users (create any role)
const createUser = async (req, res, next) => {
  try {
    const { name, email, password, phone, role, hospital_id } = req.body;

    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ success: false, message: 'Email already exists' });
    }

    const hashed = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO users (name, email, password, phone, role)
       VALUES ($1, $2, $3, $4, $5) RETURNING id, name, email, role, phone`,
      [name, email, hashed, phone, role]
    );

    const user = result.rows[0];

    // If hospital_staff, link to hospital
    if (role === 'hospital_staff' && hospital_id) {
      await pool.query(
        'INSERT INTO hospital_staff (user_id, hospital_id) VALUES ($1, $2)',
        [user.id, hospital_id]
      );
    }

    res.status(201).json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
};

// PUT /api/admin/users/:id/toggle
const toggleUserActive = async (req, res, next) => {
  try {
    const result = await pool.query(
      `UPDATE users SET is_active = NOT is_active, updated_at = NOW()
       WHERE id = $1 RETURNING id, name, email, role, is_active`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

// GET /api/admin/reports/emergencies
const getEmergencyReport = async (req, res, next) => {
  try {
    const { from, to } = req.query;

    const result = await pool.query(`
      SELECT
        DATE(created_at) as date,
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'completed') as completed,
        COUNT(*) FILTER (WHERE priority = 'critical') as critical,
        AVG(estimated_arrival_minutes) as avg_eta_minutes
      FROM emergency_requests
      WHERE ($1::date IS NULL OR created_at >= $1::date)
        AND ($2::date IS NULL OR created_at <= $2::date)
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `, [from || null, to || null]);

    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
};

module.exports = { getDashboard, getUsers, createUser, toggleUserActive, getEmergencyReport };
