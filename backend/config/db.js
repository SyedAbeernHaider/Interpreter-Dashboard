require('dotenv').config();
const mysql = require('mysql2/promise');

const dbConfig = {
    host: (process.env.DB_HOST || '127.0.0.1').trim(),
    port: Number(process.env.DB_PORT) || 3306,
    user: (process.env.DB_USER || 'root').trim(),
    password: (process.env.DB_PASS || '').trim(),
    database: (process.env.DB_NAME || 'interpreter').trim(),
    waitForConnections: true,
    connectionLimit: 10,
    connectTimeout: 10000,
};

const pool = mysql.createPool(dbConfig);

// Test connection on startup
(async () => {
    try {
        const conn = await pool.getConnection();
        console.log(`✅ MySQL connected → ${dbConfig.host} | DB: ${dbConfig.database}`);
        conn.release();
    } catch (err) {
        console.error(`❌ MySQL connection failed:`, err.message);
        console.error('TIP: Check your .env DB_HOST, DB_USER, DB_PASS, DB_NAME values.');
    }
})();

module.exports = pool;
