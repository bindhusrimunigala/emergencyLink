const pool = require('../config/db');
const { calculateDistance, estimateArrivalMinutes } = require('../utils/distance');

// GET /api/ambulances
const getAmbulances = async (req, res, next) => {
  try {
    const { status } = req.query;
    let query = `
      SELECT a.*, u.name as driver_name, u.phone as driver_phone,
             h.name as hospital_name
      FROM ambulances a
      LEFT JOIN users u ON a.driver_id = u.id
      LEFT JOIN hospitals h ON a.hospital_id = h.id
      WHERE a.is_active = true
    `;
    const params = [];

    if (status) {
      params.push(status);
      query += ` AND a.status = $${params.length}`;
    }

    query += ' ORDER BY a.created_at DESC';

    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
};

// GET /api/ambulances/:id
const getAmbulance = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT a.*, u.name as driver_name, u.phone as driver_phone,
              h.name as hospital_name
       FROM ambulances a
       LEFT JOIN users u ON a.driver_id = u.id
       LEFT JOIN hospitals h ON a.hospital_id = h.id
       WHERE a.id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Ambulance not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

// GET /api/ambulances/driver/me
const getMyAmbulance = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT a.*, u.name as driver_name, u.phone as driver_phone
       FROM ambulances a
       LEFT JOIN users u ON a.driver_id = u.id
       WHERE a.driver_id = $1 AND a.is_active = true`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'No ambulance assigned to you' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

// POST /api/ambulances (admin only)
const createAmbulance = async (req, res, next) => {
  try {
    const { vehicle_number, driver_id, hospital_id, equipment } = req.body;

    const result = await pool.query(
      `INSERT INTO ambulances (vehicle_number, driver_id, hospital_id, equipment)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [vehicle_number, driver_id, hospital_id, equipment]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

// PUT /api/ambulances/:id/location (driver only)
const updateLocation = async (req, res, next) => {
  try {
    const { latitude, longitude, speed } = req.body;
    const { id } = req.params;

    // Verify ownership
    const check = await pool.query(
      'SELECT id, driver_id FROM ambulances WHERE id = $1',
      [id]
    );
    if (check.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Ambulance not found' });
    }
    if (check.rows[0].driver_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not your ambulance' });
    }

    // Update current location
    const result = await pool.query(
      `UPDATE ambulances
       SET current_latitude = $1, current_longitude = $2,
           last_location_update = NOW(), updated_at = NOW()
       WHERE id = $3 RETURNING *`,
      [latitude, longitude, id]
    );

    // Log location history
    const activeEmergency = await pool.query(
      `SELECT id FROM emergency_requests
       WHERE assigned_ambulance_id = $1 AND status NOT IN ('completed', 'cancelled')
       LIMIT 1`,
      [id]
    );

    await pool.query(
      `INSERT INTO location_history (ambulance_id, emergency_request_id, latitude, longitude, speed)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        id,
        activeEmergency.rows.length > 0 ? activeEmergency.rows[0].id : null,
        latitude, longitude, speed || null
      ]
    );

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

// PUT /api/ambulances/:id/status
const updateAmbulanceStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE ambulances SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Ambulance not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

// GET /api/ambulances/nearby
const getNearbyAmbulances = async (req, res, next) => {
  try {
    const { latitude, longitude, radius = 10 } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({ success: false, message: 'Latitude and longitude required' });
    }

    const result = await pool.query(
      `SELECT a.*, u.name as driver_name,
              (6371 * acos(
                cos(radians($1)) * cos(radians(a.current_latitude)) *
                cos(radians(a.current_longitude) - radians($2)) +
                sin(radians($1)) * sin(radians(a.current_latitude))
              )) AS distance_km
       FROM ambulances a
       LEFT JOIN users u ON a.driver_id = u.id
       WHERE a.status = 'available'
         AND a.is_active = true
         AND a.current_latitude IS NOT NULL
         AND (6371 * acos(
               cos(radians($1)) * cos(radians(a.current_latitude)) *
               cos(radians(a.current_longitude) - radians($2)) +
               sin(radians($1)) * sin(radians(a.current_latitude))
             )) <= $3
       ORDER BY distance_km ASC`,
      [latitude, longitude, radius]
    );

    const ambulancesWithETA = result.rows.map(amb => ({
      ...amb,
      estimated_arrival_minutes: estimateArrivalMinutes(parseFloat(amb.distance_km))
    }));

    res.json({ success: true, data: ambulancesWithETA });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAmbulances,
  getAmbulance,
  getMyAmbulance,
  createAmbulance,
  updateLocation,
  updateAmbulanceStatus,
  getNearbyAmbulances
};
