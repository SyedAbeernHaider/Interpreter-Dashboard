const pool = require('../config/db');

const INDEXES = [
    // 1. monitoring_sessions
    { table: 'monitoring_sessions', index: 'idx_ms_created_at', columns: 'created_at' },
    { table: 'monitoring_sessions', index: 'idx_ms_interpreter_id', columns: 'interpreter_id' },
    { table: 'monitoring_sessions', index: 'idx_ms_customer_id', columns: 'customer_id' },
    { table: 'monitoring_sessions', index: 'idx_ms_status', columns: 'status' },

    // 2. customers
    { table: 'customers', index: 'idx_cust_email', columns: 'email' },
    { table: 'customers', index: 'idx_cust_company_id', columns: 'company_id' },

    // 3. interpreter
    { table: 'interpreter', index: 'idx_interp_email', columns: 'email' },

    // 4. interpreter_notification_responses (used for missed calls)
    { table: 'interpreter_notification_responses', index: 'idx_inr_monitoring_id', columns: 'monitoring_id' },
    { table: 'interpreter_notification_responses', index: 'idx_inr_missed_call_time', columns: 'missed_call_time' },

    // 5. companies
    { table: 'companies', index: 'idx_comp_id', columns: 'company_id' }
];

async function applyOptimization() {
    console.log('🚀 Starting Database Optimization (Corrected Table Names)...');

    for (const item of INDEXES) {
        try {
            console.log(`- Checking index ${item.index} on ${item.table}...`);

            // Check if table exists
            const [tableExists] = await pool.query(`SHOW TABLES LIKE ?`, [item.table]);
            if (tableExists.length === 0) {
                console.log(`  ⚠️ Table ${item.table} does not exist. Skipping.`);
                continue;
            }

            // Check if index exists
            const [existing] = await pool.query(`
                SHOW INDEX FROM ${item.table} WHERE Key_name = ?
            `, [item.index]);

            if (existing.length > 0) {
                console.log(`  ✅ Index ${item.index} already exists. Skipping.`);
                continue;
            }

            console.log(`  ➕ Creating index ${item.index}...`);
            await pool.query(`CREATE INDEX ${item.index} ON ${item.table}(${item.columns})`);
            console.log(`  ✅ Successfully created ${item.index}.`);
        } catch (err) {
            console.error(`  ❌ Error applying index ${item.index} on ${item.table}:`, err.message);
        }
    }

    console.log('\n✨ Optimization complete! Your dashboard should be much faster now.');
    process.exit(0);
}

applyOptimization();
