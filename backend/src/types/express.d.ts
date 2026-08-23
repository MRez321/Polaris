import 'express';

declare global {
    namespace Express {
        interface Request {
            /**
             * Populated by `attachSession` when a valid better-auth session is
             * present on the request (cookie or bearer). `null` when anonymous.
             */
            auth?: {
                user: {
                    id: string;
                    name: string;
                    email: string;
                    role?: string | null;
                    image?: string | null;
                };
                session: { id: string; token: string };
            } | null;
        }
    }
}

export {};
