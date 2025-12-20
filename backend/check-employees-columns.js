const { db } = require('./database');

db.query('SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = "employees" ORDER BY ORDINAL_POSITION')
  .then(cols => {
    console.log('Employees table columns:', cols.map(c => c.COLUMN_NAME).join(', '));
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
