const express = require("express");
const ctrl = require("../controllers/auth");
const {requireAuth} = require("../middlewares/auth");
const passport = require('../config/passport');
const jwt = require("jsonwebtoken");

const {CLIENT_URL} = process.env;


const r = express.Router();
r.post('/forgot/password', ctrl.forgot);
r.post('/reset', ctrl.reset);
r.post('/login', ctrl.login);
r.get('/me', requireAuth, ctrl.me);
/** GOOGLE */
r.get('/google',
    passport.authenticate('google', {session: false}));

r.get('/google/callback',
    passport.authenticate('google', {failureRedirect: CLIENT_URL + '/login?oauth=failed', session: false}),
    (req, res) => sendTokenPage(res, req.user)
);
r.post('/register', ctrl.register);
r.post('/resend-verification', ctrl.resendVerify);
r.get('/verify/email', ctrl.verifyEmail);


/** crée un JWT et renvoie la page de succès (popup) */
// sendTokenPage.js
function sendTokenPage(res, user) {
    const { CLIENT_URL, JWT_SECRET, JWT_EXPIRES } = process.env;
    const safeUser = { id:user.id, email:user.email, role:user.role, name:user.name, avatar:user.avatar };
    const token = jwt.sign(safeUser, JWT_SECRET, { expiresIn: JWT_EXPIRES || '7d' });
    const state = res.req.query.state || '';
    const payload = Buffer.from(JSON.stringify({ type:'OAUTH_RESULT', token, user: safeUser, state })).toString('base64url');
    res.redirect(`${CLIENT_URL}/oauth-complete?data=${payload}`);
}




module.exports = r;
