/**
 * Schema barrel. Table definitions live in domain files (auth, workshop,
 * cms, orders, company, audit); this module re-exports everything so
 * existing `schema/index.js` imports and drizzle.config.ts keep working.
 */
export * from './auth.js';
export * from './workshop.js';
export * from './cms.js';
export * from './orders.js';
export * from './company.js';
export * from './audit.js';
export * from './notifications.js';
