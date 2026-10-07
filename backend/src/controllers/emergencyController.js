const pool = require('../config/db');
const { calculateDistance, estimateArrivalMinutes } = require('../utils/distance');
const {
  notifyPatientDispatch,
  notifyPatientStatusUpdate,
  notifyDriverDispatch,
  notifyHospitalIncoming,
} = require('../services/smsService');

// POST /api/emergencies
const createEmergency = async (req, res, next) => {
  try {
    const {
      patient_name, patient_phone, emergency_type, description,
      pickup_latitude, pickup_longitude, pickup_address, priority
    } = req.body;

    const patient_id = req.user.role === 'patient' ? req.user.id : null;

    // Find nearest available ambulance
    const ambulancesResult = await pool.query(
      `SELECT id, vehicle_number, current_latitude, current_longitude, driver_id
       FROM ambulances
       WHERE status = 'available' AND is_active = true
       AND current_latitude IS NOT NULL AND current_longitude IS NOT NULL`
    );

    let assignedAmbulanceId = null;
    let estimatedMinutes = null;
    let nearestAmbulance = null;
    let minDistance = Infinity;

    for (const amb of ambulancesResult.rows) {
      const dist = calculateDistance(
        parseFloat(pickup_latitude), parseFloat(pickup_longitude),
        parseFloat(amb.current_latitude), parseFloat(amb.current_longitude)
      );
      if (dist < minDistance) {
        minDistance = dist;
        nearestAmbulance = amb;
      }
    }

    // Find nearest available hospital
    const hospitalsResult = await pool.query(
      `SELECT id, name, latitude, longitude, available_beds
       FROM hospitals
       WHERE available_beds > 0 AND is_active = true`
    );

    let destinationHospitalId = null;
    let minHospitalDist = Infinity;

    for (const hosp of hospitalsResult.rows) {
      const dist = calculateDistance(
        parseFloat(pickup_latitude), parseFloat(pickup_longitude),
        parseFloat(hosp.latitude), parseFloat(hosp.longitude)
      );
      if (dist < minHospitalDist) {
        minHospitalDist = dist;
        destinationHospitalId = hosp.id;
      }
    }

    if (nearestAmbulance) {
      assignedAmbulanceId = nearestAmbulance.id;
      estimatedMinutes = estimateArrivalMinutes(minDistance);
    }

    const result = await pool.query(
      `INSERT INTO emergency_requests
       (patient_id, patient_name, patient_phone, emergency_type, description,
        pickup_latitude, pickup_longitude, pickup_address, destination_hospital_id,
        assigned_ambulance_id, status, priority, estimated_arrival_minutes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       RETURNING *`,
      [
        patient_id, patient_name, patient_phone, emergency_type, description,
        pickup_latitude, pickup_longitude, pickup_address, destinationHospitalId,
        assignedAmbulanceId,
        assignedAmbulanceId ? 'assigned' : 'pending',
        priority || 'medium',
        estimatedMinutes
      ]
    );

    const emergency = result.rows[0];

    // Mark ambulance as dispatched
    if (assignedAmbulanceId) {
      await pool.query(
        `UPDATE ambulances SET status = 'dispatched', updated_at = NOW() WHERE id = $1`,
        [assignedAmbulanceId]
      );
    }

    // ── In-app + SMS notifications ──────────────────────────────────────────

    // 1. Notify hospital staff (in-app + SMS)
    if (destinationHospitalId) {
      const staffResult = await pool.query(
        `SELECT hs.user_id, u.phone FROM hospital_staff hs
         JOIN users u ON hs.user_id = u.id
         WHERE hs.hospital_id = $1`,
        [destinationHospitalId]
      );

      // Get hospital info for SMS
      const hospitalInfo = await pool.query(
        'SELECT name, phone FROM hospitals WHERE id = $1',
        [destinationHospitalId]
      );
      const hospital = hospitalInfo.rows[0];

      for (const staff of staffResult.rows) {
        // In-app notification
        await pool.query(
          `INSERT INTO notifications (user_id, emergency_request_id, type, title, message)
           VALUES ($1, $2, 'incoming_emergency', 'Incoming Emergency', $3)`,
          [
            staff.user_id,
            emergency.id,
            `Emergency incoming: ${emergency_type}. Patient: ${patient_name}. ETA: ${estimatedMinutes || 'TBD'} min.`
          ]
        );
        // SMS to hospital staff
        if (staff.phone) {
          notifyHospitalIncoming(
            staff.phone,
            hospital?.name || 'Your hospital',
            emergency_type,
            patient_name,
            estimatedMinutes,
            priority || 'medium'
          ).catch(err => console.error('Hospital SMS error:', err.message));
        }
      }

      // Also SMS the hospital's main phone line
      if (hospital?.phone) {
        notifyHospitalIncoming(
          hospital.phone,
          hospital.name,
          emergency_type,
          patient_name,
          estimatedMinutes,
          priority || 'medium'
        ).catch(err => console.error('Hospital main SMS error:', err.message));
      }
    }

    // 2. Notify assigned driver (in-app + SMS)
    if (nearestAmbulance && nearestAmbulance.driver_id) {
      // In-app notification
      await pool.query(
        `INSERT INTO notifications (user_id, emergency_request_id, type, title, message)
         VALUES ($1, $2, 'dispatch', 'New Dispatch', $3)`,
        [
          nearestAmbulance.driver_id,
          emergency.id,
          `You have been dispatched for a ${emergency_type} emergency. Pickup: ${pickup_address || 'See coordinates'}.`
        ]
      );
      // SMS to driver
      const driverResult = await pool.query(
        'SELECT name, phone FROM users WHERE id = $1',
        [nearestAmbulance.driver_id]
      );
      const driver = driverResult.rows[0];
      if (driver?.phone) {
        notifyDriverDispatch(
          driver.phone,
          driver.name,
          emergency_type,
          pickup_address,
          patient_name,
          patient_phone
        ).catch(err => console.error('Driver SMS error:', err.message));
      }
    }

    // 3. SMS to patient confirming dispatch
    if (patient_phone && nearestAmbulance) {
      const driverResult = await pool.query(
        'SELECT name FROM users WHERE id = $1',
        [nearestAmbulance.driver_id]
      );
      const driverName = driverResult.rows[0]?.name || 'your driver';
      notifyPatientDispatch(
        patient_phone,
        patient_name,
        nearestAmbulance.vehicle_number,
        driverName,
        estimatedMinutes
      ).catch(err => console.error('Patient dispatch SMS error:', err.message));
    }

    res.status(201).json({
      success: true,
      message: assignedAmbulanceId
        ? `Emergency created and ambulance ${nearestAmbulance.vehicle_number} dispatched`
        : 'Emergency created. No ambulance currently available.',
      data: emergency
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/emergencies
const getEmergencies = async (req, res, next) => {
  try {
    const { status, priority, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    const params = [];

    // Role-based filtering
    if (req.user.role === 'patient') {
      params.push(req.user.id);
      whereClause += ` AND er.patient_id = $${params.length}`;
    } else if (req.user.role === 'driver') {
      const ambResult = await pool.query(
        'SELECT id FROM ambulances WHERE driver_id = $1', [req.user.id]
      );
      if (ambResult.rows.length > 0) {
        params.push(ambResult.rows[0].id);
        whereClause += ` AND er.assigned_ambulance_id = $${params.length}`;
      }
    } else if (req.user.role === 'hospital_staff') {
      const hospResult = await pool.query(
        'SELECT hospital_id FROM hospital_staff WHERE user_id = $1', [req.user.id]
      );
      if (hospResult.rows.length > 0) {
        params.push(hospResult.rows[0].hospital_id);
        whereClause += ` AND er.destination_hospital_id = $${params.length}`;
      }
    }

    if (status) {
      params.push(status);
      whereClause += ` AND er.status = $${params.length}`;
    }
    if (priority) {
      params.push(priority);
      whereClause += ` AND er.priority = $${params.length}`;
    }

    params.push(limit, offset);

    const result = await pool.query(
      `SELECT er.*,
              h.name as hospital_name,
              a.vehicle_number as ambulance_vehicle_number,
              u.name as driver_name
       FROM emergency_requests er
       LEFT JOIN hospitals h ON er.destination_hospital_id = h.id
       LEFT JOIN ambulances a ON er.assigned_ambulance_id = a.id
       LEFT JOIN users u ON a.driver_id = u.id
       ${whereClause}
       ORDER BY er.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    res.json({ success: true, data: result.rows, count: result.rows.length });
  } catch (err) {
    next(err);
  }
};

// GET /api/emergencies/:id
const getEmergency = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT er.*,
              h.name as hospital_name, h.address as hospital_address, h.phone as hospital_phone,
              h.latitude as hospital_latitude, h.longitude as hospital_longitude,
              a.vehicle_number, a.current_latitude as ambulance_latitude,
              a.current_longitude as ambulance_longitude,
              u.name as driver_name, u.phone as driver_phone
       FROM emergency_requests er
       LEFT JOIN hospitals h ON er.destination_hospital_id = h.id
       LEFT JOIN ambulances a ON er.assigned_ambulance_id = a.id
       LEFT JOIN users u ON a.driver_id = u.id
       WHERE er.id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Emergency not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

// PUT /api/emergencies/:id/status
const updateEmergencyStatus = async (req, res, next) => {
  try {
    const { status, notes } = req.body;
    const { id } = req.params;

    const validStatuses = ['pending', 'assigned', 'en_route', 'at_scene', 'transporting', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const updates = { status, updated_at: 'NOW()' };
    if (status === 'completed') {
      updates.completion_time = 'NOW()';
    }

    const result = await pool.query(
      `UPDATE emergency_requests
       SET status = $1,
           notes = COALESCE($2, notes),
           completion_time = CASE WHEN $1 = 'completed' THEN NOW() ELSE completion_time END,
           updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [status, notes, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Emergency not found' });
    }

    const emergency = result.rows[0];

    // If completed or cancelled, free the ambulance
    if (['completed', 'cancelled'].includes(status) && emergency.assigned_ambulance_id) {
      await pool.query(
        `UPDATE ambulances SET status = 'available', updated_at = NOW() WHERE id = $1`,
        [emergency.assigned_ambulance_id]
      );
    }

    // ── SMS: notify patient of status change ────────────────────────────────
    if (['en_route', 'at_scene', 'transporting', 'completed'].includes(status)) {
      // Get hospital name if transporting
      let hospitalName = null;
      if (status === 'transporting' && emergency.destination_hospital_id) {
        const hospResult = await pool.query(
          'SELECT name FROM hospitals WHERE id = $1',
          [emergency.destination_hospital_id]
        );
        hospitalName = hospResult.rows[0]?.name;
      }

      if (emergency.patient_phone) {
        notifyPatientStatusUpdate(
          emergency.patient_phone,
          emergency.patient_name,
          status,
          hospitalName
        ).catch(err => console.error('Status SMS error:', err.message));
      }
    }

    res.json({ success: true, message: 'Status updated', data: emergency });
  } catch (err) {
    next(err);
  }
};

// GET /api/emergencies/active
const getActiveEmergencies = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT er.*,
              h.name as hospital_name,
              a.vehicle_number, a.current_latitude as ambulance_latitude,
              a.current_longitude as ambulance_longitude,
              u.name as driver_name
       FROM emergency_requests er
       LEFT JOIN hospitals h ON er.destination_hospital_id = h.id
       LEFT JOIN ambulances a ON er.assigned_ambulance_id = a.id
       LEFT JOIN users u ON a.driver_id = u.id
       WHERE er.status NOT IN ('completed', 'cancelled')
       ORDER BY
         CASE er.priority
           WHEN 'critical' THEN 1
           WHEN 'high' THEN 2
           WHEN 'medium' THEN 3
           WHEN 'low' THEN 4
         END,
         er.created_at ASC`
    );

    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createEmergency,
  getEmergencies,
  getEmergency,
  updateEmergencyStatus,
  getActiveEmergencies
};
