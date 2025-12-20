const { db } = require('../database');

/**
 * Automatically sync face_id from records to person.local_id
 * This ensures mobile app face_id matches person table local_id
 */
async function syncFaceIdMapping() {
  try {
    console.log('🔄 Syncing face_id to local_id mapping...');

    // Get all unique face_id and names from records that don't have a person mapping yet
    const unmappedQuery = `
      SELECT DISTINCT r.enroll_id as face_id, r.name
      FROM records r
      WHERE NOT EXISTS (
        SELECT 1 FROM person p WHERE p.local_id = r.enroll_id
      )
      AND r.name IS NOT NULL
      AND r.name != ''
      ORDER BY r.enroll_id
    `;

    const unmappedRecords = await db.query(unmappedQuery);
    
    if (unmappedRecords.length === 0) {
      console.log('✅ All face IDs are already mapped');
      return { success: true, mapped: 0 };
    }

    console.log(`📋 Found ${unmappedRecords.length} unmapped face IDs`);
    let mappedCount = 0;

    for (const record of unmappedRecords) {
      const { face_id, name } = record;

      // Find person by name (case-insensitive)
      const personQuery = `
        SELECT id, name, local_id 
        FROM person 
        WHERE LOWER(name) = LOWER(?)
        ORDER BY id DESC
        LIMIT 1
      `;
      
      const persons = await db.query(personQuery, [name]);

      if (persons.length > 0) {
        const person = persons[0];
        
        // Update person's local_id to match face_id
        const updateQuery = `UPDATE person SET local_id = ? WHERE id = ?`;
        await db.query(updateQuery, [face_id, person.id]);
        
        console.log(`✅ Mapped face_id ${face_id} to person ${person.name} (ID: ${person.id})`);
        mappedCount++;
      } else {
        console.log(`⚠️ No person found for name "${name}" with face_id ${face_id}`);
      }
    }

    console.log(`✅ Face ID mapping complete: ${mappedCount} mapped`);
    return { success: true, mapped: mappedCount };

  } catch (error) {
    console.error('❌ Error syncing face ID mapping:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Sync a single face_id when a new attendance log arrives
 */
async function syncSingleFaceId(faceId, name) {
  try {
    if (!faceId || !name) {
      return { success: false, message: 'Missing face_id or name' };
    }

    // Check if already mapped
    const existingQuery = `SELECT id FROM person WHERE local_id = ?`;
    const existing = await db.query(existingQuery, [faceId]);
    
    if (existing.length > 0) {
      return { success: true, message: 'Already mapped', person_id: existing[0].id };
    }

    // Find person by name
    const personQuery = `
      SELECT id, name 
      FROM person 
      WHERE LOWER(name) = LOWER(?)
      ORDER BY id DESC
      LIMIT 1
    `;
    
    const persons = await db.query(personQuery, [name]);

    if (persons.length > 0) {
      const person = persons[0];
      
      // Update person's local_id to match face_id
      const updateQuery = `UPDATE person SET local_id = ? WHERE id = ?`;
      await db.query(updateQuery, [faceId, person.id]);
      
      console.log(`✅ Auto-mapped face_id ${faceId} to person ${person.name} (ID: ${person.id})`);
      return { success: true, message: 'Mapped successfully', person_id: person.id };
    }

    return { success: false, message: 'Person not found' };

  } catch (error) {
    console.error('❌ Error syncing single face ID:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  syncFaceIdMapping,
  syncSingleFaceId
};
