const { db } = require('./database');

async function checkSync() {
  try {
    console.log('\n=== Checking Manager and Employee Accounts ===\n');
    
    // Get all managers
    const managers = await db.query('SELECT id, email, name FROM managers LIMIT 10');
    console.log('📊 Managers found:', managers.length);
    console.log(managers);
    
    // Get all employees
    const employees = await db.query('SELECT id, email, name FROM employees LIMIT 10');
    console.log('\n📊 Employees found:', employees.length);
    console.log(employees);
    
    // Check for matching emails
    console.log('\n🔍 Checking for matching emails:\n');
    for (const manager of managers) {
      const matchingEmployees = await db.query(
        'SELECT id, email, name FROM employees WHERE email = ?',
        [manager.email]
      );
      if (matchingEmployees.length > 0) {
        console.log(`✅ Manager ${manager.name} (${manager.email}) has matching employee account:`);
        console.log(`   Employee: ${matchingEmployees[0].name}`);
      } else {
        console.log(`❌ Manager ${manager.name} (${manager.email}) has NO matching employee account`);
      }
    }
    
    console.log('\n=== End Check ===\n');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkSync();
