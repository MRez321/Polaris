import type { Server as HttpServer } from 'http';
import { Server } from 'socket.io';

import { trustedOrigins } from '../origins.js';

let io: Server | null = null;

/**
 * Initializes socket.io on the shared HTTP server.
 * Clients can subscribe to realtime `data-changed` events to refresh views.
 */
export function initSocket(httpServer: HttpServer): Server {
    io = new Server(httpServer, {
        cors: {
            // Same-origin in production (backend serves the frontend); dev uses Vite.
            // Single source of truth: src/core/origins.ts (shared with Express
            // CORS and better-auth — the three lists can no longer drift).
            origin: trustedOrigins,
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
