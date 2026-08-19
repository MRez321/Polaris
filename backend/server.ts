import dotenv from 'dotenv';
import http from 'http';

import app from './src/app.js';
import dbPool from './src/config/db.js';
// import { initSocket } from './src/services/socketService.js';
// import './src/services/cleanupService.js';

dotenv.config();

const PORT = process.env.PORT || 3016;

// Create raw HTTP server so socket.io can attach alongside Express
const httpServer = http.createServer(app);

// Initialize socket.io on the same server
// initSocket(httpServer);

// Start Server
httpServer.listen(PORT, async () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`🔌 Socket.io ready`);

    // Test DB connection
    try {
        await dbPool.query('SELECT 1+1 AS solution');
        console.log('✅ Database connection successful.');
    } catch (err) {
        console.error('❌ Database connection failed:', err);
        process.exit(1);
    }
});
