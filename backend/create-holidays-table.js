const { db } = require('./database');

async function createHolidaysTable() {
  try {
    // Create holidays table
    await db.query(`
      CREATE TABLE IF NOT EXISTS holidays (
        id INT PRIMARY KEY AUTO_INCREMENT,
        date_from DATE NOT NULL,
        date_to DATE NOT NULL,
        description TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_date_from (date_from),
        INDEX idx_date_to (date_to)
      )
    `);

    console.log('Holidays table created successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error creating holidays table:', error);
    process.exit(1);
  }
}

createHolidaysTable();
