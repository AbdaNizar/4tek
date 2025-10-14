// const jwt = require("jsonwebtoken");
//
// const sendTokenPage = async function (res, user) {
//     const { CLIENT_URL, JWT_SECRET, JWT_EXPIRES } = process.env;
//
//     const safeUser = {
//         id: user.id,
//         email: user.email,
//         role: user.role,
//         name: user.name,
//         avatar: user.avatar
//     };
//     const token = jwt.sign(safeUser, JWT_SECRET, { expiresIn: JWT_EXPIRES || '7d' });
//
//     // Optional: include state if you appended ?state=... when opening popup
//     const state = res.req.query.state || '';
//
//     // Put payload into hash (not query) – no server logs / CORS issues
//     const payload = Buffer.from(JSON.stringify({
//         type: 'OAUTH_RESULT',
//         token,
//         user: safeUser,
//         state
//     })).toString('base64url');
//
//     // Send popup to the *client origin* (http://localhost:4200)
//     // so the message origin will be 4200 (what you’re seeing).
//   return  res.redirect(`${CLIENT_URL}/oauth-complete#data=${payload}`);
// }
//
//
//
//
//
// module.exports = { sendTokenPage };
