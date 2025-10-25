const r = require('express').Router();
const { requireAuth, requireAdmin } = require('../middlewares/auth');
const c = require('../controllers/ratings');

r.get('/product/:productId', c.listByProduct);
r.get('/my/:productId', requireAuth, c.getMineForProduct);
r.post('/', requireAuth, c.createOrUpsert);

// admin
r.get('/admin', requireAuth, requireAdmin, c.adminList);
r.patch('/admin/:id/status', requireAuth, requireAdmin, c.adminSetStatus);
r.delete('/admin/:id', requireAuth, requireAdmin, c.adminDelete);

module.exports = r;
