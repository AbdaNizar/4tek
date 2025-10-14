const express = require('express');
const r = express.Router();
const ctrl = require('../controllers/categoryController');
const {requireAuth, requireAdmin} = require('../middlewares/auth');
const {upload, addPublicUrl} = require('../middlewares/upload');

// IMPORTANT: fields must match FormData keys from the frontend
const uploadFields = upload.fields([
    {name: 'image', maxCount: 1},
    {name: 'icon', maxCount: 1},
    {name: 'banners', maxCount: 20},
]);

r.get('/', ctrl.list);
r.get('/:id', ctrl.getOne);

// 🛡️ Protège toutes les routes admin
r.post('/',requireAuth,requireAdmin,ctrl.create);
r.put('/:id', requireAuth, requireAdmin, ctrl.update);
r.patch('/:id/toggle', requireAuth, requireAdmin, ctrl.toggle);
r.delete('/:id', requireAuth, requireAdmin, ctrl.remove);
r.put('/:id/replace', requireAuth, requireAdmin, ctrl.replace);

module.exports = r;
