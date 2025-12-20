const { db } = require('./database');

async function createNotificationsTable() {
  try {
    console.log('Creating notifications table...');
    
    // Drop existing table if it exists
    await db.query('DROP TABLE IF EXISTS notifications');
    console.log('Dropped existing notifications table');
    
    // Create new table with correct structure
    await db.query(`
      CREATE TABLE notifications (
        id INT PRIMARY KEY AUTO_INCREMENT,
        employee_id INT NOT NULL,
        subject VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        notification_type ENUM('sms', 'note') DEFAULT 'note',
        url_link TEXT,
        attachment VARCHAR(500),
        is_read TINYINT(1) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        read_at TIMESTAMP NULL,
        INDEX idx_employee_id (employee_id),
        INDEX idx_is_read (is_read),
        INDEX idx_created_at (created_at),
        FOREIGN KEY (employee_id) REFERENCES employees(employeeid) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    
    console.log('✅ Notifications table created successfully with subject column!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error creating notifications table:', error.message);
    process.exit(1);
  }
}

createNotificationsTable();
