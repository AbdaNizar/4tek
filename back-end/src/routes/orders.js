// routes/orders.js
const r = require('express').Router();
const { requireAuth, requireAdmin } = require('../middlewares/auth');
const ctrl = require('../controllers/orders');

// ---------- Admin first (avoid /:id catching /admin) ----------
r.get('/admin',               requireAuth, requireAdmin, ctrl.listAdminOrders);
r.get('/admin/stats',         requireAuth, requireAdmin, ctrl.getAdminOrderStats);
r.get('/admin/:id',           requireAuth, requireAdmin, ctrl.getAdminOrder);
r.patch('/admin/:id/status',  requireAuth, requireAdmin, ctrl.updateAdminOrderStatus);
r.patch('/admin/:id/note',    requireAuth, requireAdmin, ctrl.updateAdminOrderNote);
r.delete('/admin/:id',        requireAuth, requireAdmin, ctrl.deleteAdminOrder);

// ---------- Customer ----------
r.post('/',     requireAuth, ctrl.create);
r.get('/me',    requireAuth, ctrl.getMine);
r.get('/:id',   requireAuth, ctrl.getById);
r.get('/:id/invoice', ctrl.downloadInvoice);


module.exports = r;
