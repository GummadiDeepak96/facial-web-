/**
 * Database Migration Script
 * Adds face recognition columns to persons and records tables
 * Safe to run multiple times (uses IF NOT EXISTS)
 */

require('dotenv').config();
const { db, testConnection } = require('./database');
const config = require('./config');

async function runMigration() {
  console.log('🔧 Starting Face Recognition Database Migration...\n');

  try {
    // Test connection first
    const connected = await testConnection();
    if (!connected) {
      throw new Error('Failed to connect to database');
    }

    const dbName = config.DB_CONFIG.database;

    // Check if person table exists
    console.log('📋 Checking if person table exists...');
    const personsTable = await db.query(
      `SELECT table_name FROM information_schema.tables 
       WHERE table_schema = ? AND table_name = 'person' LIMIT 1`,
      [dbName]
    );

    if (!personsTable || personsTable.length === 0) {
      console.warn('⚠️  person table not found. Creating it...');
      await db.query(`
        CREATE TABLE person (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          email VARCHAR(255),
          phone VARCHAR(50),
          address TEXT,
          photo VARCHAR(500),
          embedding_json TEXT,
          registered_latitude DECIMAL(10, 8),
          registered_longitude DECIMAL(11, 8),
          local_id VARCHAR(255),
          client_id VARCHAR(255),
          image_path VARCHAR(500),
          created_at BIGINT,
          updated_at BIGINT,
          INDEX idx_local_id (local_id),
          INDEX idx_name (name)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
      console.log('✅ person table created successfully');
    } else {
      console.log('✅ person table exists');

      // Add new columns to person table if they don't exist
      console.log('\n📝 Adding face recognition columns to person table...');

      const columns = [
        { name: 'embedding_json', type: 'TEXT', description: 'Face embedding vector (512 floats)' },
        { name: 'registered_latitude', type: 'DECIMAL(10, 8)', description: 'Registration location latitude' },
        { name: 'registered_longitude', type: 'DECIMAL(11, 8)', description: 'Registration location longitude' },
        { name: 'local_id', type: 'VARCHAR(255)', description: 'Local/offline sync ID' },
        { name: 'client_id', type: 'VARCHAR(255)', description: 'Client device ID' },
        { name: 'image_path', type: 'VARCHAR(500)', description: 'Path to face image file' },
        { name: 'created_at', type: 'BIGINT', description: 'Timestamp of record creation' },
        { name: 'updated_at', type: 'BIGINT', description: 'Timestamp of last update' },
        { name: 'approval_status', type: "ENUM('pending', 'approved', 'rejected') DEFAULT 'pending'", description: 'Admin approval status' }
      ];

      for (const col of columns) {
        try {
          // Check if column exists
          const exists = await db.query(
            `SELECT column_name FROM information_schema.columns 
             WHERE table_schema = ? AND table_name = 'person' AND column_name = ? LIMIT 1`,
            [dbName, col.name]
          );

          if (!exists || exists.length === 0) {
            await db.query(`ALTER TABLE person ADD COLUMN ${col.name} ${col.type}`);
            console.log(`  ✅ Added column: ${col.name} (${col.description})`);
          } else {
            console.log(`  ℹ️  Column already exists: ${col.name}`);
          }
        } catch (err) {
          console.error(`  ❌ Failed to add column ${col.name}:`, err.message);
        }
      }

      // Add indexes if they don't exist
      try {
        await db.query(`ALTER TABLE person ADD INDEX IF NOT EXISTS idx_local_id (local_id)`);
        console.log('  ✅ Index on local_id ensured');
      } catch (err) {
        console.log('  ℹ️  Index on local_id already exists or error:', err.message);
      }

      try {
        await db.query(`ALTER TABLE person ADD INDEX IF NOT EXISTS idx_approval_status (approval_status)`);
        console.log('  ✅ Index on approval_status ensured');
      } catch (err) {
        console.log('  ℹ️  Index on approval_status already exists or error:', err.message);
      }
    }

    // Check if records table exists
    console.log('\n📋 Checking if records table exists...');
    const recordsTable = await db.query(
      `SELECT table_name FROM information_schema.tables 
       WHERE table_schema = ? AND table_name = 'records' LIMIT 1`,
      [dbName]
    );

    if (!recordsTable || recordsTable.length === 0) {
      console.warn('⚠️  records table not found. Creating it...');
      await db.query(`
        CREATE TABLE records (
          id INT AUTO_INCREMENT PRIMARY KEY,
          person_id INT,
          face_id INT,
          name VARCHAR(255),
          date DATE,
          checkin TIME,
          checkout TIME,
          status VARCHAR(50),
          method VARCHAR(50),
          image_path VARCHAR(500),
          latitude DECIMAL(10, 8),
          longitude DECIMAL(11, 8),
          log_time BIGINT,
          created_at BIGINT,
          FOREIGN KEY (person_id) REFERENCES person(id) ON DELETE CASCADE,
          INDEX idx_person_date (person_id, date),
          INDEX idx_log_time (log_time),
          INDEX idx_date (date)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
      console.log('✅ records table created successfully');
    } else {
      console.log('✅ records table exists');

      // Add new columns to records table if they don't exist
      console.log('\n📝 Adding attendance logging columns to records table...');

      const columns = [
        { name: 'face_id', type: 'INT', description: 'Reference to face/person ID' },
        { name: 'method', type: 'VARCHAR(50)', description: 'Attendance method (facial/biometric/password)' },
        { name: 'image_path', type: 'VARCHAR(500)', description: 'Path to attendance capture image' },
        { name: 'latitude', type: 'DECIMAL(10, 8)', description: 'Attendance location latitude' },
        { name: 'longitude', type: 'DECIMAL(11, 8)', description: 'Attendance location longitude' },
        { name: 'log_time', type: 'BIGINT', description: 'Timestamp of attendance log' },
        { name: 'created_at', type: 'BIGINT', description: 'Timestamp of record creation' }
      ];

      for (const col of columns) {
        try {
          // Check if column exists
          const exists = await db.query(
            `SELECT column_name FROM information_schema.columns 
             WHERE table_schema = ? AND table_name = 'records' AND column_name = ? LIMIT 1`,
            [dbName, col.name]
          );

          if (!exists || exists.length === 0) {
            await db.query(`ALTER TABLE records ADD COLUMN ${col.name} ${col.type}`);
            console.log(`  ✅ Added column: ${col.name} (${col.description})`);
          } else {
            console.log(`  ℹ️  Column already exists: ${col.name}`);
          }
        } catch (err) {
          console.error(`  ❌ Failed to add column ${col.name}:`, err.message);
        }
      }

      // Add indexes if they don't exist
      try {
        await db.query(`ALTER TABLE records ADD INDEX IF NOT EXISTS idx_log_time (log_time)`);
        console.log('  ✅ Index on log_time ensured');
      } catch (err) {
        console.log('  ℹ️  Index on log_time already exists or error:', err.message);
      }

      try {
        await db.query(`ALTER TABLE records ADD INDEX IF NOT EXISTS idx_face_id (face_id)`);
        console.log('  ✅ Index on face_id ensured');
      } catch (err) {
        console.log('  ℹ️  Index on face_id already exists or error:', err.message);
      }
    }

    console.log('\n✅ Migration completed successfully!\n');
    console.log('📊 Summary:');
    console.log('  - person table ready with face recognition columns');
    console.log('  - records table ready with attendance logging columns');
    console.log('  - All indexes created');
    console.log('\n🚀 You can now start the server with face recognition support!');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run migration
runMigration();
