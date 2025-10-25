const router = require('express').Router();
const { requireAuth } = require('../middlewares/auth'); // JWT check (req.user)

const ctrl = require('../controllers/cart');

// Toutes ces routes nécessitent un utilisateur connecté

router.get('/', requireAuth, ctrl.getMyCart);
router.put('/', requireAuth, ctrl.replaceCart);
router.post('/merge', requireAuth, ctrl.mergeCart);

module.exports = router;
