const express = require('express');
const router  = express.Router();
const sub = require('../controllers/subcategoryController');
const {requireAuth, requireAdmin} = require('../middlewares/auth');



// CRUD
router.get('/' , sub.list);
router.get('/:id', sub.getOne);
router.post('/',requireAuth,requireAdmin, sub.create);
router.put('/:id',requireAuth,requireAdmin,  sub.update);
router.post('/:id/replace',requireAuth,requireAdmin,  sub.replace);
router.post('/:id/toggle',requireAuth,requireAdmin, sub.toggle);
router.delete('/:id',requireAuth,requireAdmin, sub.remove);
router.get('/by-category/:categoryId', sub.listByCategory);


module.exports = router;
