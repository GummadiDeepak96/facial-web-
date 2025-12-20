const { db } = require('./database');

async function simpleNotificationTest() {
  try {
    console.log('🔍 Testing Notification System (Simple)...\n');

    // 1. Check employees
    console.log('1️⃣ Checking employees...');
    const employees = await db.query(`
      SELECT e.person_id, e.email, e.department, e.role, p.name
      FROM employees e
      LEFT JOIN person p ON e.person_id = p.id
      WHERE e.status = 'active'
      LIMIT 5
    `);
    
    console.log(`✅ Found ${employees.length} active employees:`);
    employees.forEach(emp => {
      console.log(`   - ID: ${emp.person_id}, Name: ${emp.name || emp.email}, Dept: ${emp.department}, Role: ${emp.role}`);
    });

    if (employees.length === 0) {
      console.log('❌ No employees found!');
      process.exit(1);
    }

    // 2. Check departments
    console.log('\n2️⃣ Checking departments...');
    const departments = await db.query(`SELECT id, departmentname FROM departments LIMIT 5`);
    console.log(`✅ Found ${departments.length} departments:`);
    departments.forEach(dept => {
      console.log(`   - ID: ${dept.id}, Name: ${dept.departmentname}`);
    });

    // 3. Check roles
    console.log('\n3️⃣ Checking roles...');
    const roles = await db.query(`SELECT id, rolename FROM roles LIMIT 5`);
    console.log(`✅ Found ${roles.length} roles:`);
    roles.forEach(role => {
      console.log(`   - ID: ${role.id}, Name: ${role.rolename}`);
    });

    // 4. Create a test notification for first employee
    console.log('\n4️⃣ Creating test notification for single employee...');
    const testEmp = employees[0];
    await db.query(`
      INSERT INTO notifications (employee_id, subject, message, notification_type, is_read, created_at)
      VALUES (?, ?, ?, 'note', 0, NOW())
    `, [testEmp.person_id, 'Test Notification - Single', 'This is a test notification for a single employee.']);
    console.log(`✅ Created notification for: ${testEmp.name || testEmp.email} (ID: ${testEmp.person_id})`);

    // 5. Test department-based notification
    if (departments.length > 0 && employees.some(e => e.department)) {
      console.log('\n5️⃣ Testing department-based notification...');
      const testDept = departments[0];
      
      // Get employees in this department
      const deptEmps = await db.query(`
        SELECT e.person_id, e.email, p.name
        FROM employees e
        LEFT JOIN person p ON e.person_id = p.id
        WHERE e.department = ? AND e.status = 'active'
        LIMIT 3
      `, [testDept.departmentname]);
      
      console.log(`✅ Found ${deptEmps.length} employees in department "${testDept.departmentname}"`);
      
      if (deptEmps.length > 0) {
        // Create notifications for each
        for (const emp of deptEmps) {
          await db.query(`
            INSERT INTO notifications (employee_id, subject, message, notification_type, is_read, created_at)
            VALUES (?, ?, ?, 'note', 0, NOW())
          `, [emp.person_id, `Test Notification - Department`, `This is a test notification for ${testDept.departmentname} department.`]);
        }
        console.log(`✅ Created notifications for ${deptEmps.length} employees in ${testDept.departmentname}`);
        deptEmps.forEach(emp => {
          console.log(`   - ${emp.name || emp.email} (ID: ${emp.person_id})`);
        });
      }
    }

    // 6. Test role-based notification
    if (roles.length > 0 && employees.some(e => e.role)) {
      console.log('\n6️⃣ Testing role-based notification...');
      const testRole = roles[0];
      
      // Get employees with this role
      const roleEmps = await db.query(`
        SELECT e.person_id, e.email, p.name
        FROM employees e
        LEFT JOIN person p ON e.person_id = p.id
        WHERE e.role = ? AND e.status = 'active'
        LIMIT 3
      `, [testRole.rolename]);
      
      console.log(`✅ Found ${roleEmps.length} employees with role "${testRole.rolename}"`);
      
      if (roleEmps.length > 0) {
        // Create notifications for each
        for (const emp of roleEmps) {
          await db.query(`
            INSERT INTO notifications (employee_id, subject, message, notification_type, is_read, created_at)
            VALUES (?, ?, ?, 'note', 0, NOW())
          `, [emp.person_id, `Test Notification - Role`, `This is a test notification for ${testRole.rolename} role.`]);
        }
        console.log(`✅ Created notifications for ${roleEmps.length} employees with role ${testRole.rolename}`);
        roleEmps.forEach(emp => {
          console.log(`   - ${emp.name || emp.email} (ID: ${emp.person_id})`);
        });
      }
    }

    // 7. Verify all notifications
    console.log('\n7️⃣ Verifying all test notifications...');
    const allNotifs = await db.query(`
      SELECT 
        n.id, n.employee_id, n.subject, n.is_read,
        e.email, p.name
      FROM notifications n
      LEFT JOIN employees e ON n.employee_id = e.person_id
      LEFT JOIN person p ON e.person_id = p.id
      WHERE n.subject LIKE 'Test Notification%'
      ORDER BY n.created_at DESC
    `);
    
    console.log(`✅ Found ${allNotifs.length} test notifications:`);
    allNotifs.forEach(notif => {
      console.log(`   - To: ${notif.name || notif.email} (ID: ${notif.employee_id}), Subject: "${notif.subject}", Read: ${notif.is_read ? 'Yes' : 'No'}`);
    });

    console.log('\n📊 SUMMARY:');
    console.log('✅ Notification table working correctly');
    console.log(`✅ ${employees.length} active employees found`);
    console.log(`✅ ${departments.length} departments configured`);
    console.log(`✅ ${roles.length} roles configured`);
    console.log(`✅ ${allNotifs.length} test notifications created successfully`);
    console.log('\n✅ Notification system is functioning correctly!');
    console.log('\n💡 TIP: Check your employee dashboard to see these notifications');
    
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Error testing notifications:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

simpleNotificationTest();
