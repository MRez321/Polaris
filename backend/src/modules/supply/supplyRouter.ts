import { Router } from 'express';
import { requirePermission } from '../../modules/auth/permissions.js';
import * as c from './supplyController.js';

/**
 * P0-C supply module (item 14/15/16): suppliers, purchase requests, purchase
 * orders, goods receipts, and landed cost. Mounted at /api/workshop/supply by
 * workshopAdminChain — so requireAuth + requireRole('admin') already applies;
 * requirePermission adds the per-operation capability gate.
 */
const router = Router();

// --- Suppliers ---
router.get('/suppliers', requirePermission('suppliers.view'), c.listSuppliers);
router.post('/suppliers', requirePermission('suppliers.manage'), c.createSupplier);
router.get('/suppliers/:id', requirePermission('suppliers.view'), c.getSupplier);
router.patch('/suppliers/:id', requirePermission('suppliers.manage'), c.updateSupplier);
router.post('/suppliers/:id/activate', requirePermission('suppliers.manage'), c.activateSupplier);
router.post('/suppliers/:id/deactivate', requirePermission('suppliers.manage'), c.deactivateSupplier);
router.get('/suppliers/:id/prices', requirePermission('suppliers.view'), c.listSupplierPrices);
router.get('/suppliers/:id/detail', requirePermission('suppliers.view'), c.getSupplierDetail);

// --- Purchase requests ---
router.get('/purchase-requests', requirePermission('purchasing.view'), c.listRequests);
router.post('/purchase-requests', requirePermission('purchasing.manage'), c.createRequest);
router.get('/purchase-requests/:id', requirePermission('purchasing.view'), c.getRequest);
router.patch('/purchase-requests/:id', requirePermission('purchasing.manage'), c.updateRequest);
router.post('/purchase-requests/:id/convert', requirePermission('purchasing.manage'), c.convertRequest);
router.post('/purchase-requests/:id/:action', requirePermission('purchasing.manage'), c.moveRequest);

// --- Purchase orders ---
router.get('/purchase-orders', requirePermission('purchasing.view'), c.listOrders);
router.post('/purchase-orders', requirePermission('purchasing.manage'), c.createOrder);
router.get('/purchase-orders/:id', requirePermission('purchasing.view'), c.getOrder);
router.patch('/purchase-orders/:id', requirePermission('purchasing.manage'), c.updateOrder);
router.post('/purchase-orders/:id/cancel', requirePermission('purchasing.manage'), c.cancelOrder);

// --- Receipts ---
router.post('/purchase-orders/:id/receipts', requirePermission('purchasing.receive'), c.createReceipt);
router.get('/purchase-orders/:id/receipts', requirePermission('purchasing.view'), c.listReceipts);
router.get('/receipts/:id', requirePermission('purchasing.view'), c.getReceipt);

// --- Supply costs ---
router.post('/purchase-orders/:id/costs', requirePermission('supplycosts.manage'), c.addCost);
router.get('/purchase-orders/:id/costs', requirePermission('purchasefinance.view'), c.listCosts);
router.patch('/purchase-orders/:id/costs/:costId', requirePermission('supplycosts.manage'), c.updateCost);
router.delete('/purchase-orders/:id/costs/:costId', requirePermission('supplycosts.manage'), c.deleteCost);
router.get('/purchase-orders/:id/landed-cost', requirePermission('purchasefinance.view'), c.getLandedCost);

export default router;
