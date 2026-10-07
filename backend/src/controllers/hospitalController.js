const pool = require('../config/db');
const { calculateDistance } = require('../utils/distance');

// GET /api/hospitals
const getHospitals = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT h.*, COUNT(hs.user_id) as staff_count
       FROM hospitals h
       LEFT JOIN hospital_staff hs ON h.id = hs.hospital_id
       WHERE h.is_active = true
       GROUP BY h.id
       ORDER BY h.name`
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
};

// GET /api/hospitals/:id
const getHospital = async (req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT * FROM hospitals WHERE id = $1 AND is_active = true',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Hospital not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

// GET /api/hospitals/nearest
const getNearestHospitals = async (req, res, next) => {
  try {
    const { latitude, longitude, limit = 5 } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({ success: false, message: 'Latitude and longitude required' });
    }

    const result = await pool.query(
      `SELECT *,
              (6371 * acos(
                cos(radians($1)) * cos(radians(latitude)) *
                cos(radians(longitude) - radians($2)) +
                sin(radians($1)) * sin(radians(latitude))
              )) AS distance_km
       FROM hospitals
       WHERE is_active = true AND available_beds > 0
       ORDER BY distance_km ASC
       LIMIT $3`,
      [latitude, longitude, limit]
    );

    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
};

// POST /api/hospitals (admin only)
const createHospital = async (req, res, next) => {
  try {
    const { name, address, phone, latitude, longitude, total_beds, available_beds, has_icu, has_trauma_center, specializations } = req.body;

    const result = await pool.query(
      `INSERT INTO hospitals (name, address, phone, latitude, longitude, total_beds, available_beds, has_icu, has_trauma_center, specializations)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [name, address, phone, latitude, longitude, total_beds, available_beds || total_beds, has_icu || false, has_trauma_center || false, specializations || []]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

// PUT /api/hospitals/:id (admin or hospital_staff)
const updateHospital = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { available_beds, has_icu, has_trauma_center, phone, specializations } = req.body;

    // Hospital staff can only update their own hospital
    if (req.user.role === 'hospital_staff') {
      const staffCheck = await pool.query(
        'SELECT hospital_id FROM hospital_staff WHERE user_id = $1 AND hospital_id = $2',
        [req.user.id, id]
      );
      if (staffCheck.rows.length === 0) {
        return res.status(403).json({ success: false, message: 'You can only update your own hospital' });
      }
    }

    const result = await pool.query(
      `UPDATE hospitals
       SET available_beds = COALESCE($1, available_beds),
           has_icu = COALESCE($2, has_icu),
           has_trauma_center = COALESCE($3, has_trauma_center),
           phone = COALESCE($4, phone),
           specializations = COALESCE($5, specializations),
           updated_at = NOW()
       WHERE id = $6 RETURNING *`,
      [available_beds, has_icu, has_trauma_center, phone, specializations, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Hospital not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

// GET /api/hospitals/me (hospital staff only)
const getMyHospital = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT h.* FROM hospitals h
       JOIN hospital_staff hs ON h.id = hs.hospital_id
       WHERE hs.user_id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'No hospital assigned to you' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

// GET /api/hospitals/:id/incoming (hospital staff only)
const getIncomingEmergencies = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Verify staff belongs to this hospital
    if (req.user.role === 'hospital_staff') {
      const check = await pool.query(
        'SELECT hospital_id FROM hospital_staff WHERE user_id = $1 AND hospital_id = $2',
        [req.user.id, id]
      );
      if (check.rows.length === 0) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }
    }

    const result = await pool.query(
      `SELECT er.*,
              a.vehicle_number, a.current_latitude as ambulance_latitude,
              a.current_longitude as ambulance_longitude,
              u.name as driver_name, u.phone as driver_phone
       FROM emergency_requests er
       LEFT JOIN ambulances a ON er.assigned_ambulance_id = a.id
       LEFT JOIN users u ON a.driver_id = u.id
       WHERE er.destination_hospital_id = $1
         AND er.status NOT IN ('completed', 'cancelled')
       ORDER BY
         CASE er.priority
           WHEN 'critical' THEN 1
           WHEN 'high' THEN 2
           WHEN 'medium' THEN 3
           WHEN 'low' THEN 4
         END,
         er.created_at ASC`,
      [id]
    );

    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getHospitals,
  getHospital,
  getNearestHospitals,
  createHospital,
  updateHospital,
  getMyHospital,
  getIncomingEmergencies
};
