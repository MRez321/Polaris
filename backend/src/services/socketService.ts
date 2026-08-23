import type { Server as HttpServer } from 'http';
import { Server } from 'socket.io';

let io: Server | null = null;

/**
 * Initializes socket.io on the shared HTTP server.
 * Clients can subscribe to realtime `data-changed` events to refresh views.
 */
export function initSocket(httpServer: HttpServer): Server {
    io = new Server(httpServer, {
        cors: {
            origin: [
                process.env.FRONTEND_URL || 'http://localhost:5173',
                'http://localhost:5173',
                'https://polarisstyle.ir',
            ],
            credentials: true,
        },
    });
    io.on('connection', (socket) => {
        console.log(`🔌 Socket connected: ${socket.id}`);
        socket.on('disconnect', () => {
            console.log(`🔌 Socket disconnected: ${socket.id}`);
        });
    });
    return io;
}

/**
 * Broadcasts a data-change event. Safe to call before init (no-op).
 */
export function emitDataChanged(entity: string, action: string): void {
    io?.emit('data-changed', { entity, action, at: new Date().toISOString() });
}
