require('dotenv').config();
const pool = require('./db');

const createTables = async () => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Users table (all roles)
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        phone VARCHAR(20),
        role VARCHAR(50) NOT NULL CHECK (role IN ('patient', 'driver', 'hospital_staff', 'admin')),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Hospitals table
    await client.query(`
      CREATE TABLE IF NOT EXISTS hospitals (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        address TEXT NOT NULL,
        phone VARCHAR(20) NOT NULL,
        latitude DECIMAL(10, 8) NOT NULL,
        longitude DECIMAL(11, 8) NOT NULL,
        total_beds INTEGER DEFAULT 0,
        available_beds INTEGER DEFAULT 0,
        has_icu BOOLEAN DEFAULT false,
        has_trauma_center BOOLEAN DEFAULT false,
        specializations TEXT[],
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Ambulances table
    await client.query(`
      CREATE TABLE IF NOT EXISTS ambulances (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        vehicle_number VARCHAR(50) UNIQUE NOT NULL,
        driver_id UUID REFERENCES users(id) ON DELETE SET NULL,
        hospital_id UUID REFERENCES hospitals(id) ON DELETE SET NULL,
        status VARCHAR(50) DEFAULT 'available' CHECK (status IN ('available', 'dispatched', 'en_route', 'at_scene', 'transporting', 'maintenance', 'offline')),
        current_latitude DECIMAL(10, 8),
        current_longitude DECIMAL(11, 8),
        last_location_update TIMESTAMP,
        equipment TEXT[],
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Emergency requests table
    await client.query(`
      CREATE TABLE IF NOT EXISTS emergency_requests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        patient_id UUID REFERENCES users(id) ON DELETE SET NULL,
        patient_name VARCHAR(255) NOT NULL,
        patient_phone VARCHAR(20) NOT NULL,
        emergency_type VARCHAR(100) NOT NULL,
        description TEXT,
        pickup_latitude DECIMAL(10, 8) NOT NULL,
        pickup_longitude DECIMAL(11, 8) NOT NULL,
        pickup_address TEXT,
        destination_hospital_id UUID REFERENCES hospitals(id) ON DELETE SET NULL,
        assigned_ambulance_id UUID REFERENCES ambulances(id) ON DELETE SET NULL,
        status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'assigned', 'en_route', 'at_scene', 'transporting', 'completed', 'cancelled')),
        priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
        estimated_arrival_minutes INTEGER,
        actual_arrival_time TIMESTAMP,
        completion_time TIMESTAMP,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Location tracking history
    await client.query(`
      CREATE TABLE IF NOT EXISTS location_history (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        ambulance_id UUID REFERENCES ambulances(id) ON DELETE CASCADE,
        emergency_request_id UUID REFERENCES emergency_requests(id) ON DELETE SET NULL,
        latitude DECIMAL(10, 8) NOT NULL,
        longitude DECIMAL(11, 8) NOT NULL,
        speed DECIMAL(5, 2),
        recorded_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Hospital staff assignments
    await client.query(`
      CREATE TABLE IF NOT EXISTS hospital_staff (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        hospital_id UUID REFERENCES hospitals(id) ON DELETE CASCADE,
        role VARCHAR(100) DEFAULT 'staff',
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, hospital_id)
      )
    `);

    // Notifications table
    await client.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        emergency_request_id UUID REFERENCES emergency_requests(id) ON DELETE SET NULL,
        type VARCHAR(100) NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        is_read BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await client.query('COMMIT');
    console.log('✅ All tables created successfully');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', err.message);
    throw err;
  } finally {
    client.release();
    pool.end();
  }
};

createTables().catch(console.error);
