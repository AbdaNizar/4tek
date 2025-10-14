const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require("../models/user");

const { SERVER_URL, GOOGLE_REDIRECT_PATH, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } = process.env;

passport.use(new GoogleStrategy({
    clientID: GOOGLE_CLIENT_ID,
    clientSecret: GOOGLE_CLIENT_SECRET,
    // doit être EXACTEMENT l’URL décidée ci-dessus
    callbackURL: `${SERVER_URL}${GOOGLE_REDIRECT_PATH}`, // ex: http://localhost:3000/v1/auth/google/callback
    scope: ['profile', 'email']
}, async (accessToken, refreshToken, profile, done) => {
    try {
        // ... upsert user ...
        const email = profile.emails?.[0]?.value?.toLowerCase() || null;
        const name  = profile.displayName || '';
        const avatar = profile.photos?.[0]?.value || null;
        const providerId = profile.id;

        const user = await User.findOneAndUpdate(
            { $or: [ { email }, { 'providers.google': providerId } ].filter(Boolean) },
            { $setOnInsert: { role:'user', active:true , isVerified :true}, $set: { email, name, avatar, 'providers.google': providerId } },
            { upsert: true, new: true }
        );

        done(null, user);
    } catch (e) {
        done(e);
    }
}));

module.exports = passport;
