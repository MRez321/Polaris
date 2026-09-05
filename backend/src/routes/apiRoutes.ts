import { Router } from 'express';

import { requireAuth, requireRole } from '../modules/auth/middleware.js';
import { health } from '../controllers/healthController.js';
import * as pub from '../modules/workshop/controllers/publicController.js';
import * as blog from '../modules/cms/blogController.js';
import * as orders from '../controllers/ordersController.js';
import * as addresses from '../controllers/addressesController.js';
import * as company from '../modules/cms/companyController.js';
import * as website from '../modules/cms/websiteController.js';
import * as gallery from '../modules/cms/galleryController.js';
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
router.get('/orders/mine/:id', orders.getMyOrder);

// Customer address book: owner-scoped CRUD.
router.get('/addresses', addresses.listMyAddresses);
router.post('/addresses', addresses.createAddress);
router.put('/addresses/:id', addresses.updateAddress);
router.delete('/addresses/:id', addresses.deleteAddress);

// Blog CMS: admin + author roles only.
router.get('/blog', requireRole('admin', 'author'), blog.listPosts);
router.post('/blog', requireRole('admin', 'author'), blog.createPost);
router.put('/blog/:id', requireRole('admin', 'author'), blog.updatePost);
router.delete('/blog/:id', requireRole('admin', 'author'), blog.deletePost);

// Everything below is admin-only.
router.use(requireRole('admin'));

// Workshop business tracking moved to its own module mount at
// /api/workshop — see workshopAdminChain below. Legacy inline mount
// removed in Phase 5; /api/workshop is now the only path.

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
 * workshopRouter), exported so app.ts can mount the workshop API at
 * /api/workshop — its single, only mount point.
 */
export const workshopAdminChain: Router = (() => {
    const gated = Router();
    gated.use(requireAuth, requireRole('admin'), workshopRouter);
    return gated;
})();

export default router;
