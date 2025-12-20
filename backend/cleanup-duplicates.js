const { db, testConnection } = require('./database');

async function cleanupDuplicates() {
  console.log('🧹 Cleaning up duplicate/incorrect attendance records...\n');
  
  try {
    await testConnection();
    
    // Get today's date
    const today = new Date().toISOString().split('T')[0];
    console.log('Today:', today);
    
    // Check what we have
    console.log('\n1. Current attendance_summary records for today:');
    const current = await db.query(
      `SELECT id, enroll_id, DATE(date) as date_only, first_in, last_out 
       FROM attendance_summary 
       WHERE DATE(date) = ?
       ORDER BY enroll_id, id`,
      [today]
    );
    console.log('Found', current.length, 'records:');
    current.forEach(r => {
      console.log(`  ID: ${r.id}, enroll_id: ${r.enroll_id}, date: ${r.date_only}, in: ${r.first_in}, out: ${r.last_out}`);
    });
    
    // Get valid person IDs
    console.log('\n2. Valid person IDs:');
    const persons = await db.query('SELECT id, name FROM person');
    console.log('Valid person IDs:', persons.map(p => `${p.id}:${p.name}`).join(', '));
    const validIds = persons.map(p => p.id);
    
    // Find records with invalid enroll_id (not in person table)
    console.log('\n3. Finding records with invalid enroll_id...');
    const invalid = current.filter(r => !validIds.includes(r.enroll_id));
    console.log('Invalid records:', invalid.length);
    
    if (invalid.length > 0) {
      console.log('\n4. Deleting invalid records...');
      for (const rec of invalid) {
        console.log(`  Deleting record ID ${rec.id} (enroll_id: ${rec.enroll_id})`);
        await db.query('DELETE FROM attendance_summary WHERE id = ?', [rec.id]);
      }
      console.log('✅ Deleted', invalid.length, 'invalid records');
    }
    
    // Check for actual duplicates (same person, same date)
    console.log('\n5. Checking for duplicate records (same person, same date)...');
    const duplicates = await db.query(
      `SELECT enroll_id, DATE(date) as date_only, COUNT(*) as cnt, GROUP_CONCAT(id) as ids
       FROM attendance_summary
       WHERE DATE(date) = ?
       GROUP BY enroll_id, DATE(date)
       HAVING cnt > 1`,
      [today]
    );
    
    if (duplicates.length > 0) {
      console.log('Found', duplicates.length, 'duplicate groups:');
      for (const dup of duplicates) {
        console.log(`  enroll_id: ${dup.enroll_id}, count: ${dup.cnt}, IDs: ${dup.ids}`);
        
        // Keep the one with latest last_out, delete others
        const ids = dup.ids.split(',').map(Number);
        const records = await db.query(
          `SELECT id, first_in, last_out FROM attendance_summary WHERE id IN (${ids.join(',')}) ORDER BY last_out DESC`
        );
        
        const keepId = records[0].id;
        const deleteIds = ids.filter(id => id !== keepId);
        
        console.log(`    Keeping ID ${keepId}, deleting:`, deleteIds);
        for (const delId of deleteIds) {
          await db.query('DELETE FROM attendance_summary WHERE id = ?', [delId]);
        }
      }
      console.log('✅ Cleaned up duplicates');
    } else {
      console.log('No duplicates found');
    }
    
    // Final check
    console.log('\n6. Final check - records after cleanup:');
    const final = await db.query(
      `SELECT ats.id, ats.enroll_id, p.name, DATE(ats.date) as date_only, ats.first_in, ats.last_out
       FROM attendance_summary ats
       INNER JOIN person p ON ats.enroll_id = p.id
       WHERE DATE(ats.date) = ?
       ORDER BY p.name`,
      [today]
    );
    console.log('Found', final.length, 'valid records:');
    final.forEach(r => {
      console.log(`  ${r.name} (${r.enroll_id}): ${r.first_in} - ${r.last_out}`);
    });
    
    console.log('\n✅ Cleanup completed');
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

cleanupDuplicates();
