require('dotenv').config();
const pool = require('./db');
const bcrypt = require('bcryptjs');

const seed = async () => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const hashedPassword = await bcrypt.hash('password123', 10);

    // Seed admin user
    await client.query(`
      INSERT INTO users (name, email, password, phone, role)
      VALUES ('Admin User', 'admin@emergencylink.com', $1, '9999999999', 'admin')
      ON CONFLICT (email) DO NOTHING
    `, [hashedPassword]);

    // Seed hospitals
    const hospitalResult = await client.query(`
      INSERT INTO hospitals (name, address, phone, latitude, longitude, total_beds, available_beds, has_icu, has_trauma_center, specializations)
      VALUES
        ('City General Hospital', '123 Main Street, City Center', '044-12345678', 13.0827, 80.2707, 200, 45, true, true, ARRAY['trauma', 'cardiology', 'neurology']),
        ('St. Mary Medical Center', '456 Church Road, West District', '044-87654321', 13.0569, 80.2425, 150, 30, true, false, ARRAY['orthopedics', 'pediatrics']),
        ('Apollo Emergency Care', '789 Hospital Ave, East Zone', '044-11223344', 13.1067, 80.2956, 300, 80, true, true, ARRAY['burn_unit', 'cardiac_surgery', 'neurosurgery'])
      ON CONFLICT DO NOTHING
      RETURNING id, name
    `);

    // Seed driver users
    const driver1 = await client.query(`
      INSERT INTO users (name, email, password, phone, role)
      VALUES ('Ravi Kumar', 'driver1@emergencylink.com', $1, '9876543210', 'driver')
      ON CONFLICT (email) DO NOTHING
      RETURNING id
    `, [hashedPassword]);

    const driver2 = await client.query(`
      INSERT INTO users (name, email, password, phone, role)
      VALUES ('Suresh Babu', 'driver2@emergencylink.com', $1, '9876543211', 'driver')
      ON CONFLICT (email) DO NOTHING
      RETURNING id
    `, [hashedPassword]);

    // Seed ambulances
    if (driver1.rows.length > 0) {
      await client.query(`
        INSERT INTO ambulances (vehicle_number, driver_id, status, current_latitude, current_longitude, equipment)
        VALUES ('TN01AB1234', $1, 'available', 13.0827, 80.2707, ARRAY['defibrillator', 'oxygen', 'stretcher'])
        ON CONFLICT DO NOTHING
      `, [driver1.rows[0].id]);
    }

    if (driver2.rows.length > 0) {
      await client.query(`
        INSERT INTO ambulances (vehicle_number, driver_id, status, current_latitude, current_longitude, equipment)
        VALUES ('TN01CD5678', $1, 'available', 13.0569, 80.2425, ARRAY['ventilator', 'oxygen', 'stretcher', 'ECG'])
        ON CONFLICT DO NOTHING
      `, [driver2.rows[0].id]);
    }

    // Seed hospital staff
    if (hospitalResult.rows.length > 0) {
      const staffUser = await client.query(`
        INSERT INTO users (name, email, password, phone, role)
        VALUES ('Dr. Priya Singh', 'hospital1@emergencylink.com', $1, '9876543212', 'hospital_staff')
        ON CONFLICT (email) DO NOTHING
        RETURNING id
      `, [hashedPassword]);

      if (staffUser.rows.length > 0) {
        await client.query(`
          INSERT INTO hospital_staff (user_id, hospital_id, role)
          VALUES ($1, $2, 'emergency_coordinator')
          ON CONFLICT DO NOTHING
        `, [staffUser.rows[0].id, hospitalResult.rows[0].id]);
      }
    }

    // Seed a patient user
    await client.query(`
      INSERT INTO users (name, email, password, phone, role)
      VALUES ('John Patient', 'patient@emergencylink.com', $1, '9876543213', 'patient')
      ON CONFLICT (email) DO NOTHING
    `, [hashedPassword]);

    await client.query('COMMIT');
    console.log('✅ Seed data inserted successfully');
    console.log('\n📋 Demo Credentials:');
    console.log('  Admin:    admin@emergencylink.com / password123');
    console.log('  Driver 1: driver1@emergencylink.com / password123');
    console.log('  Driver 2: driver2@emergencylink.com / password123');
    console.log('  Hospital: hospital1@emergencylink.com / password123');
    console.log('  Patient:  patient@emergencylink.com / password123');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Seed failed:', err.message);
    throw err;
  } finally {
    client.release();
    pool.end();
  }
};

seed().catch(console.error);
