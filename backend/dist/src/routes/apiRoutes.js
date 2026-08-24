import { Router } from 'express';
import * as items from '../controllers/itemsController.js';
import * as sellers from '../controllers/sellersController.js';
import * as consignments from '../controllers/consignmentsController.js';
import * as payments from '../controllers/paymentsController.js';
import * as staff from '../controllers/staffController.js';
import * as expenses from '../controllers/expensesController.js';
import * as trash from '../controllers/trashController.js';
import * as company from '../controllers/companyController.js';
import * as dashboard from '../controllers/dashboardController.js';
const router = Router();
// Health & dashboard
router.get('/health', dashboard.health);
router.get('/dashboard/stats', dashboard.dashboardStats);
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
// Audit logs
router.get('/audit-logs', dashboard.listAuditLogs);
export default router;
//# sourceMappingURL=apiRoutes.js.map