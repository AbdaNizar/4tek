const r = require('express').Router();
const contactCtrl = require('../controllers/contact');
const { requireAuth, requireAdmin } = require('../middlewares/auth');

// Public: création d’une demande (user connecté facultatif)
r.post('/', requireAuth,(req, _res, next) => { next(); }, contactCtrl.create);

// Admin: liste / lecture / maj
r.get('/admin', requireAuth, requireAdmin, contactCtrl.list);
r.get('/admin/:id', requireAuth, requireAdmin, contactCtrl.getOne);
r.patch('/admin/:id', requireAuth, requireAdmin, contactCtrl.update);

module.exports = r;
