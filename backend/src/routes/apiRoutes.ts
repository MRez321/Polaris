import { Router } from 'express';

import { requireAuth, requireRole } from '../middleware/authMiddleware.js';
import * as items from '../controllers/itemsController.js';
import * as sellers from '../controllers/sellersController.js';
import * as consignments from '../controllers/consignmentsController.js';
import * as payments from '../controllers/paymentsController.js';
import * as staff from '../controllers/staffController.js';
import * as expenses from '../controllers/expensesController.js';
import * as trash from '../controllers/trashController.js';
import * as company from '../controllers/companyController.js';
import * as website from '../controllers/websiteController.js';
import * as dashboard from '../controllers/dashboardController.js';
import * as gallery from '../controllers/galleryController.js';
import * as pub from '../controllers/publicController.js';
import * as blog from '../controllers/blogController.js';
import * as orders from '../controllers/ordersController.js';


const router = Router();
// Health stays public (uptime probes).
router.get('/health', dashboard.health);

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

// Dashboard stats: admin-only (workshop data must not leak to website users).
router.get('/dashboard/stats', dashboard.dashboardStats);

// Orders management: all orders + status transitions.
router.get('/orders', orders.listAllOrders);
router.put('/orders/:id', orders.updateOrderStatus);


// Items & categories
router.get('/items', items.listItems);
router.post('/items', items.createItem);
router.put('/items/:id', items.updateItem);
router.delete('/items/:id', items.deleteItem);
router.get('/categories', items.listCategories);
router.post('/categories', items.createCategory);

// Sellers
router.get('/sellers', sellers.listSellers);
router.post('/sellers', sellers.createSeller);
router.get('/sellers/:id', sellers.getSeller);
router.put('/sellers/:id', sellers.updateSeller);
router.delete('/sellers/:id', sellers.deleteSeller);

// Consignments (handovers) & returns
router.get('/consignments', consignments.listConsignments);
router.post('/consignments', consignments.createConsignment);
router.post('/consignments/return', consignments.submitReturn);
router.get('/consignments/returns', consignments.listReturns);
router.delete('/consignments/:id', consignments.deleteConsignment);

// Payments
router.get('/payments', payments.listPayments);
router.post('/payments', payments.createPayment);

// Staff & owners
router.get('/staff', staff.listStaff);
router.post('/staff', staff.createStaff);
router.put('/staff/:id', staff.updateStaff);
router.delete('/staff/:id', staff.deleteStaff);
router.get('/owners', staff.listOwners);
router.put('/owners', staff.updateOwners);

// Expenses & profit distribution
router.get('/expenses', expenses.listExpenses);
router.post('/expenses', expenses.createExpense);
router.put('/expenses/:id', expenses.updateExpense);
router.delete('/expenses/:id', expenses.deleteExpense);
router.get('/profit-distribution', expenses.listProfitDistributions);
router.post('/profit-distribution', expenses.createProfitDistribution);

// Trash / recycle bin
router.get('/trash', trash.listTrash);
router.post('/trash/restore/:type/:id', trash.restoreEntity);
router.put('/trash/edit-and-restore/:type/:id', trash.editAndRestore);
router.delete('/trash/permanent/:type/:id', trash.permanentDelete);

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
// Audit logs
router.get('/audit-logs', dashboard.listAuditLogs);

export default router;
