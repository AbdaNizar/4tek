const express = require("express");
const ctrl = require("../controllers/auth");
const {requireAuth, requireAdmin} = require("../middlewares/auth");
const authGoogleRoutes = require('../routes/auth.google');
const authfacebookRoutes = require('../routes/auth.facebook');


const r = express.Router();

r.post('/login', ctrl.login);
r.post('/logout', ctrl.logout);
r.get('/me', requireAuth, ctrl.me);
r.post('/refresh', ctrl.refresh);
// garde tes autres endpoints: register, forgot/reset, verify, google/facebook...
r.post('/register', ctrl.register);
r.post('/forgot/password', ctrl.forgot);
r.post('/reset', ctrl.reset);
r.post('/resend-verification', ctrl.resendVerify);
r.get('/verify/email', ctrl.verifyEmail);
r.patch('/me', requireAuth, ctrl.updateUser);
r.get('/admin/users', requireAuth, requireAdmin, ctrl.getAdminUsers);
r.get('/admin/users/:id', requireAuth, requireAdmin, ctrl.getAdminUserDetail);
/** GOOGLE */
r.use('/google', authGoogleRoutes);
r.use('/facebook', authfacebookRoutes);

module.exports = r;
