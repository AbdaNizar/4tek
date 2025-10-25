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
r.post('/register', ctrl.register);
r.post('/resend-verification', ctrl.resendVerify);
r.get('/verify/email', ctrl.verifyEmail);
r.patch('/me', requireAuth,ctrl.updateUser);
/** GOOGLE */
r.get('/google',
    passport.authenticate('google', {session: false}));

r.get('/google/callback',
    passport.authenticate('google', {failureRedirect: CLIENT_URL + '/login?oauth=failed', session: false}),
    (req, res) => sendTokenPage(res, req.user)
);



/** crée un JWT et renvoie la page de succès (popup) */
// sendTokenPage.js
// sendTokenPage.js
function sendTokenPage(res, user) {
    const { CLIENT_URL, JWT_SECRET, JWT_EXPIRES } = process.env;

    // be sure to use Mongo _id as string
    const uid = (user._id || user.id).toString();

    const safeUser = {
        id: uid,
        email: user.email,
        role: user.role,
        name: user.name,
        avatar: user.avatar
    };

    // include sub in the JWT so your middleware can read it
    const token = jwt.sign(
        {
            sub: uid,           // <-- important
            role: user.role,    // optional extra claims
            email: user.email
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES || '7d' }
    );

    const state = res.req.query.state || '';
    const payload = Buffer.from(
        JSON.stringify({ type: 'OAUTH_RESULT', token, user: safeUser, state })
    ).toString('base64url');

    res.redirect(`${CLIENT_URL}/oauth-complete?data=${payload}`);
}





module.exports = r;
