// server.js (extraits principaux déjà présents chez toi)
const path = require('path');
const dotenv = require('dotenv');
const NODE_ENV = (process.env.NODE_ENV || 'development').trim();
dotenv.config({ path: path.resolve(__dirname, NODE_ENV === 'production' ? '.production.env' : '.env') });

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const fileUpload = require('express-fileupload');
const cookieParser = require('cookie-parser');
const hpp = require('hpp');

const connectDB = require('./src/config/db');
const apiRoutes = require('./src/routes');
const redirectBrowserRequests = require('./src/middlewares/redirectBrowserRequests');
const {startNotificationCron} = require("./src/lib/cron/notifications-cron");

const app = express();

app.set('trust proxy', 1);
app.use(cookieParser());

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(hpp());
app.use(morgan(NODE_ENV === 'production' ? 'production' : 'dev'));
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
    .split(',').map(s => s.trim()).filter(Boolean);
app.use(cors({
    origin: (origin, cb) => {
        if (!origin) return cb(null, true);
        // Postman, curl
        if (allowedOrigins.includes(origin)) return cb(null, true);
        return cb(new Error('Origin not allowed by CORS'));
    },
    credentials: true,  // << must
    methods: ['GET','POST','PUT','PATCH','DELETE'],
    allowedHeaders: ['Content-Type','Authorization','X-CSRF-Token','x-4tek-client'],
}));
app.use(redirectBrowserRequests(process.env.CLIENT_URL));

app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

const maxUploadMb = Number(process.env.MAX_FILE_SIZE_MB || 200);
app.use(fileUpload({
    createParentPath: true,
    limits: { fileSize: maxUploadMb * 1024 * 1024 },
    abortOnLimit: true,
}));
const PUBLIC_UPLOADS_DIR = process.env.PUBLIC_UPLOADS_DIR || path.join(__dirname, 'src', 'uploads');
app.use('/v1/uploads', express.static(PUBLIC_UPLOADS_DIR, { fallthrough: true }));



// rate limit
app.use('/v1', rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000,
    standardHeaders: true,
    legacyHeaders: false,
}));

// routes
app.use('/v1', apiRoutes);

app.get('/health', (_req, res) => res.json({ ok: true, env: NODE_ENV, time: new Date().toISOString() }));

app.use((req, res) => res.status(404).json({ error: 'Not found' }));

app.use((err, _req, res, _next) => {
    if (NODE_ENV !== 'production') console.error('[ERROR]', err);
    res.status(err.status || 500).json({ error: err.message || 'Server error' });
});

connectDB().then(() => {
    const PORT = Number(process.env.PORT || 3000);
    app.listen(PORT, async () => {
        console.log(`✅ API 4tek (${NODE_ENV}) sur http://localhost:${PORT}`);
        console.log('CORS allowed:', allowedOrigins.join(', '));
        console.log('Uploads dir:', PUBLIC_UPLOADS_DIR);
        await startNotificationCron();

    });

}).catch(err => {
    console.error('❌ DB connection failed:', err.message);
    process.exit(1);
});

module.exports = app;