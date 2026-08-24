// test-db-connection.js
import mysql from 'mysql2';

// Database configuration
const dbConfig = {
    host: '127.0.0.1',
    port: 3306,
    user: 'MRez',
    password: '64321608',
    database: 'polaris',
    connectTimeout: 10000 // 10 seconds timeout
};

// Create connection
const connection = mysql.createConnection(dbConfig);

console.log('🔄 Testing database connection...');
console.log(`📊 Host: ${dbConfig.host}:${dbConfig.port}`);
console.log(`👤 User: ${dbConfig.user}`);
console.log(`🗄️  Database: ${dbConfig.database}`);
console.log('---');

// Test the connection
connection.connect((err) => {
    if (err) {
        console.error('❌ Connection failed!');
        console.error('Error:', err.message);
        if (err.code === 'ER_ACCESS_DENIED_ERROR') {
            console.error('💡 Invalid username or password');
        } else if (err.code === 'ECONNREFUSED') {
            console.error('💡 MySQL server is not running or port is incorrect');
        } else if (err.code === 'ER_BAD_DB_ERROR') {
            console.error('💡 Database "polaris" does not exist');
        }
        process.exit(1);
    }

    console.log('✅ Connection successful!');

    // Optional: Run a simple query to verify
    connection.query('SELECT VERSION() as version', (err, results) => {
        if (err) {
            console.error('❌ Query failed:', err.message);
        } else {
            console.log(`📦 MySQL Version: ${results[0].version}`);
            console.log('✅ Database is ready and responsive');
        }

        // Close connection
        connection.end((err) => {
            if (err) {
                console.error('Error closing connection:', err.message);
            } else {
                console.log('🔌 Connection closed');
            }
            process.exit(0);
        });
    });
});