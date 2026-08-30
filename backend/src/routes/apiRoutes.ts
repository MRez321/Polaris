import { Router } from 'express';

import { requireAuth, requireRole } from '../core/middleware/authMiddleware.js';
import { health } from '../controllers/healthController.js';
import * as pub from '../modules/workshop/controllers/publicController.js';
import * as blog from '../controllers/blogController.js';
import * as orders from '../controllers/ordersController.js';
import * as company from '../controllers/companyController.js';
import * as website from '../controllers/websiteController.js';
import * as gallery from '../controllers/galleryController.js';
import workshopRouter from '../modules/workshop/router.js';

const router = Router();

// Health stays public (uptime probes) and global — outside any module.
router.get('/health', health);

// Public storefront: anonymous-readable catalog for the marketing site.
// Responses are filtered to marketing-safe fields in publicController —
// cost/consignment prices, stock levels and internal branding stay private.
router.get('/public/items', pub.listPublicItems);
router.get('/public/categories', pub.listPublicCategories);
router.get('/public/company', pub.getPublicCompany);
router.get('/public/blog', pub.listPublicBlogPosts);
router.get('/public/blog/:slug', pub.getPublicBlogPost);

router.use(requireAuth);

// Customer orders: any authenticated user (website customers).
router.post('/orders', orders.createOrder);
router.get('/orders/mine', orders.listMyOrders);

// Blog CMS: admin + author roles only.
router.get('/blog', requireRole('admin', 'author'), blog.listPosts);
router.post('/blog', requireRole('admin', 'author'), blog.createPost);
router.put('/blog/:id', requireRole('admin', 'author'), blog.updatePost);
router.delete('/blog/:id', requireRole('admin', 'author'), blog.deletePost);

// Everything below is admin-only.
router.use(requireRole('admin'));

// Workshop business tracking: the module router owns its sub-path structure;
// apiRoutes owns the role gate so the auth order stays in one visible place.
router.use(workshopRouter);

// Company branding
router.get('/company', company.getCompanyBranding);
router.put('/company', company.updateCompanyBranding);
// Public website (marketing site) settings
router.get('/website/settings', website.getWebsite);
router.put('/website/settings', website.updateWebsite);
// Image uploads & central gallery
router.post('/uploads', gallery.uploadMiddleware, gallery.uploadImages);
router.get('/gallery', gallery.listImages);
router.patch('/gallery/:id', gallery.updateImage);
router.delete('/gallery/:id', gallery.deleteImage);

/**
 * The admin-gated workshop chain (requireAuth → requireRole('admin') →
 * workshopRouter), exported so app.ts can mount the same contract at the
 * /api/workshop prefix. During the migration window both mounts serve the
 * same handlers; Phase 5 removes the legacy inline mount.
 */
export const workshopAdminChain: Router = (() => {
    const gated = Router();
    gated.use(requireAuth, requireRole('admin'), workshopRouter);
    return gated;
})();

export default router;
