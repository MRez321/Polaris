// startup.ts must be the first import: it registers crash guards and prints
// boot diagnostics before any other module (better-auth config, DB pool) runs.
import './src/startup.js';
import http from 'http';
import app from './src/app.js';
import dbPool from './src/config/db.js';
import { initSocket } from './src/services/socketService.js';
const PORT = process.env.PORT || 3016;
// Create raw HTTP server so socket.io can attach alongside Express
const httpServer = http.createServer(app);
// Initialize socket.io on the same server
initSocket(httpServer);
// Start Server
httpServer.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log('🔌 Socket.io ready');
    // Test DB connection — but NEVER exit on failure. On cPanel shared hosting
    // MySQL can be briefly unreachable; exiting puts the app in a restart loop
    // and every request degrades to an opaque 503 page. /api/health reports
    // the database state and the pool reconnects on its own once MySQL answers.
    dbPool
        .query('SELECT 1')
        .then(() => console.log('✅ Database connection successful'))
        .catch((err) => console.error('❌ Database connection failed (staying up; /api/health will report it):', err instanceof Error ? err.message : err));
    console.log(`📦 Process ID: ${process.pid}`);
    console.log(`⏰ Started at: ${new Date().toISOString()}`);
});
//# sourceMappingURL=server.js.map