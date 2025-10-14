const R = require('express').Router();
const ctrl = require('../controllers/brand');
const {requireAuth, requireAdmin} = require("../middlewares/auth");

R.get('/', ctrl.list);
R.get('/:id', ctrl.get);
R.post('/',requireAuth, requireAdmin, ctrl.create);                      // multipart pour icon
R.put('/:id',requireAuth, requireAdmin, ctrl.update);
R.post('/:id/replace',  requireAuth, requireAdmin,ctrl.replaceIcon);         // multipart {icon}
R.delete('/:id', requireAuth, requireAdmin , ctrl.remove);
R.patch('/:id/toggle', requireAuth, requireAdmin, ctrl.toggle);
module.exports = R;
