import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();
const dbConfig = {
    host: process.env.DB_HOST ?? '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3306', 10), // ← ADD: cPanel sometimes uses non-standard ports
    user: process.env.DB_USER ?? 'root',
    password: process.env.DB_PASSWORD ?? '',
    database: process.env.DB_NAME ?? 'polaris',
    waitForConnections: true,
    connectionLimit: 10,
    enableKeepAlive: true, // ← ADD: Prevents stale connections on shared hosting
    keepAliveInitialDelay: 10000, // ← ADD: 10s delay before first keepalive probe
    timezone: 'Z', // Store/read DATETIME as UTC so ISO round-trips are exact
};
const pool = mysql.createPool(dbConfig);
async function testConnection() {
    try {
        const connection = await pool.getConnection();
        console.log('✅ Database connected successfully');
        connection.release();
    }
    catch (error) {
        console.error('❌ Database connection failed:', error.message);
        // ⚠️ DO NOT call process.exit(1) here during development
        // On cPanel shared hosting, the app may restart in a loop
        // Let the pool retry naturally; log and monitor instead
    }
}
testConnection();
export default pool;
//# sourceMappingURL=db.js.map