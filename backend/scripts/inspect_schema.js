const pool = require('../config/db');

async function inspectSchema() {
    try {
        const [tables] = await pool.query('SHOW TABLES');
        console.log('Database Tables:');
        for (const row of tables) {
            const tableName = Object.values(row)[0];
            console.log(`- ${tableName}`);
            const [columns] = await pool.query(`DESCRIBE ${tableName}`);
            columns.forEach(col => {
                // console.log(`  - ${col.Field} (${col.Type})`);
            });
        }
    } catch (err) {
        console.error('Error inspecting schema:', err.message);
    }
    process.exit(0);
}

inspectSchema();
