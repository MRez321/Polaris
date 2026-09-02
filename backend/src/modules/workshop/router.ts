import { Router } from 'express';

import { requireRole } from '../../modules/auth/middleware.js';
import * as items from './controllers/itemsController.js';
import * as sellers from './controllers/sellersController.js';
import * as consignments from './controllers/consignmentsController.js';
import * as payments from './controllers/paymentsController.js';
import * as staff from './controllers/staffController.js';
import * as expenses from './controllers/expensesController.js';
import * as trash from './controllers/trashController.js';
import * as dashboard from './controllers/dashboardController.js';
import * as orders from './controllers/ordersController.js';
import * as notifications from '../../modules/notifications/notificationsController.js';

/**
 * Workshop (business-tracking) routes. Mounted at /api/workshop and, during
 * the migration window, at the legacy /api prefix as well. Every route here
 * is admin-only: the router is mounted behind requireRole('admin') — mounted
 * that way by apiRoutes.ts, which owns the global auth order.
 */
const router = Router();

// Dashboard stats: admin-only (workshop data must not leak to website users).
router.get('/dashboard/stats', dashboard.dashboardStats);

// Audit trail: paginated newest-first; client filters locally.
router.get('/audit-logs', dashboard.listAuditLogs);

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

// Outbound notifications (Telegram / Melipayamak SMS) settings + test sends
router.get('/notifications/settings', notifications.getNotifications);
router.put('/notifications/settings', notifications.updateNotifications);
router.post('/notifications/test/telegram', notifications.testTelegramNotification);
router.post('/notifications/test/sms', notifications.testSmsNotification);

export default router;
