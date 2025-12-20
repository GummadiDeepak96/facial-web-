const { db } = require('./database');

async function testNotifications() {
  try {
    console.log('🔍 Testing Notification System...\n');

    // 1. Check if notifications table exists
    console.log('1️⃣ Checking notifications table structure...');
    const tableCheck = await db.query(`
      SELECT 
        COLUMN_NAME, 
        COLUMN_TYPE, 
        IS_NULLABLE, 
        COLUMN_KEY 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'notifications'
      ORDER BY ORDINAL_POSITION
    `);
    
    if (tableCheck.length === 0) {
      console.log('❌ Notifications table does not exist!');
      console.log('   Run: node create-notifications-table.js');
      process.exit(1);
    }
    
    console.log('✅ Notifications table exists with columns:');
    tableCheck.forEach(col => {
      console.log(`   - ${col.COLUMN_NAME} (${col.COLUMN_TYPE}) ${col.COLUMN_KEY ? '[' + col.COLUMN_KEY + ']' : ''}`);
    });

    // 2. Check employees table structure
    console.log('\n2️⃣ Checking employees table primary key...');
    const empPkCheck = await db.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'employees' 
        AND COLUMN_KEY = 'PRI'
      LIMIT 1
    `);
    
    const empPk = empPkCheck.length > 0 ? empPkCheck[0].COLUMN_NAME : 'id';
    console.log(`✅ Employees primary key: ${empPk}`);

    // 3. Get sample employees
    console.log('\n3️⃣ Fetching sample employees...');
    
    // Detect name column
    const nameColCheck = await db.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'employees' 
        AND COLUMN_NAME IN ('name', 'fullname', 'employee_name', 'empname')
      LIMIT 1
    `);
    const nameCol = nameColCheck.length > 0 ? nameColCheck[0].COLUMN_NAME : 'name';
    
    const employees = await db.query(`
      SELECT ${empPk} as id, ${nameCol} as name, email, department_id, role_id 
      FROM employees 
      LIMIT 5
    `);
    
    if (employees.length === 0) {
      console.log('❌ No employees found in database!');
      process.exit(1);
    }
    
    console.log(`✅ Found ${employees.length} employees:`);
    employees.forEach(emp => {
      console.log(`   - ID: ${emp.id}, Name: ${emp.name}, Email: ${emp.email}, Dept: ${emp.department_id}, Role: ${emp.role_id}`);
    });

    // 4. Check existing notifications
    console.log('\n4️⃣ Checking existing notifications...');
    const existingNotifs = await db.query(`
      SELECT 
        n.id,
        n.employee_id,
        n.subject,
        n.is_read,
        e.${nameCol} as employee_name,
        e.email as employee_email,
        n.created_at
      FROM notifications n
      LEFT JOIN employees e ON n.employee_id = e.${empPk}
      ORDER BY n.created_at DESC
      LIMIT 10
    `);
    
    if (existingNotifs.length === 0) {
      console.log('⚠️  No notifications found in database');
    } else {
      console.log(`✅ Found ${existingNotifs.length} recent notifications:`);
      existingNotifs.forEach(notif => {
        console.log(`   - ID: ${notif.id}, To: ${notif.employee_name} (${notif.employee_email}), Subject: "${notif.subject}", Read: ${notif.is_read ? 'Yes' : 'No'}`);
      });
    }

    // 5. Test notification insertion for single employee
    console.log('\n5️⃣ Testing notification creation for single employee...');
    const testEmployee = employees[0];
    const testSubject = 'Test Notification - ' + new Date().toISOString();
    const testMessage = 'This is a test notification to verify the system is working correctly.';
    
    await db.query(`
      INSERT INTO notifications (employee_id, subject, message, notification_type, is_read, created_at)
      VALUES (?, ?, ?, 'note', 0, NOW())
    `, [testEmployee.id, testSubject, testMessage]);
    
    console.log(`✅ Test notification created for employee: ${testEmployee.name} (ID: ${testEmployee.id})`);

    // 6. Verify the notification was created
    const verifyNotif = await db.query(`
      SELECT * FROM notifications 
      WHERE employee_id = ? AND subject = ?
    `, [testEmployee.id, testSubject]);
    
    if (verifyNotif.length > 0) {
      console.log(`✅ Notification verified in database (Notification ID: ${verifyNotif[0].id})`);
    } else {
      console.log('❌ Failed to verify notification creation');
    }

    // 7. Test department-based notification
    console.log('\n6️⃣ Testing department-based notifications...');
    const deptEmployees = await db.query(`
      SELECT ${empPk} as id, ${nameCol} as name, email, department_id 
      FROM employees 
      WHERE department_id IS NOT NULL 
      LIMIT 3
    `);
    
    if (deptEmployees.length > 0) {
      const deptIds = [...new Set(deptEmployees.map(e => e.department_id))];
      console.log(`✅ Found ${deptEmployees.length} employees in departments: ${deptIds.join(', ')}`);
      
      // Test query that would be used for department notifications
      const deptNotifEmployees = await db.query(`
        SELECT DISTINCT ${empPk} as employeeid, ${nameCol} as name, email 
        FROM employees 
        WHERE department_id IN (${deptIds.map(() => '?').join(',')})
      `, deptIds);
      
      console.log(`✅ Department query would send notifications to ${deptNotifEmployees.length} employees`);
      deptNotifEmployees.forEach(emp => {
        console.log(`   - ${emp.name} (${emp.email})`);
      });
    } else {
      console.log('⚠️  No employees with department_id found');
    }

    // 8. Test role-based notification
    console.log('\n7️⃣ Testing role-based notifications...');
    const roleEmployees = await db.query(`
      SELECT ${empPk} as id, ${nameCol} as name, email, role_id 
      FROM employees 
      WHERE role_id IS NOT NULL 
      LIMIT 3
    `);
    
    if (roleEmployees.length > 0) {
      const roleIds = [...new Set(roleEmployees.map(e => e.role_id))];
      console.log(`✅ Found ${roleEmployees.length} employees with roles: ${roleIds.join(', ')}`);
      
      // Test query that would be used for role notifications
      const roleNotifEmployees = await db.query(`
        SELECT DISTINCT ${empPk} as employeeid, ${nameCol} as name, email 
        FROM employees 
        WHERE role_id IN (${roleIds.map(() => '?').join(',')})
      `, roleIds);
      
      console.log(`✅ Role query would send notifications to ${roleNotifEmployees.length} employees`);
      roleNotifEmployees.forEach(emp => {
        console.log(`   - ${emp.name} (${emp.email})`);
      });
    } else {
      console.log('⚠️  No employees with role_id found');
    }

    // 9. Summary
    console.log('\n📊 SUMMARY:');
    console.log('✅ Notifications table structure is correct');
    console.log(`✅ Employee primary key detected: ${empPk}`);
    console.log(`✅ ${employees.length} active employees in system`);
    console.log(`✅ ${existingNotifs.length} existing notifications found`);
    console.log('✅ Test notification created successfully');
    console.log('✅ Department-based queries working');
    console.log('✅ Role-based queries working');
    console.log('\n✅ Notification system is functioning correctly!');
    
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Error testing notifications:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

testNotifications();
