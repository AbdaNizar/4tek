const express = require('express');
const { requireAuth ,requireAdmin } = require('../middlewares/auth');
const ctrl = require('../controllers/productController');

// ATTENTION : tu dois avoir express-fileupload activé globalement dans server.js:
// app.use(fileUpload({ useTempFiles: false, createParentPath: true }));

const r = express.Router();

// Public
r.get('/', ctrl.list);
r.get('/:id', ctrl.getOne);

// Admin only
r.post('/', requireAuth, requireAdmin, ctrl.create);
r.patch('/:id', requireAuth, requireAdmin, ctrl.update);
r.post('/:id/toggle', requireAuth, requireAdmin, ctrl.toggle);
r.delete('/:id', requireAuth, requireAdmin, ctrl.remove);
r.put('/:id/replace', requireAuth, requireAdmin, ctrl.replace);
r.get('/one/slug/:slug', ctrl.getBySlug);

module.exports = r;
