import { auth } from '../config/auth.js';

declare global {
    namespace Express {
        interface Request {
            user?: typeof auth.$Infer.Session.user;
        }
    }
}