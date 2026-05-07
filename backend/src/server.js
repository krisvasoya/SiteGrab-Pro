// ─────────────────────────────────────────
//  SiteGrab Pro — server.js
// ─────────────────────────────────────────
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const crawlRouter = require('./routes/crawl');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 5000;

// ── Security middleware ──────────────────
app.use(helmet());
app.use(morgan('combined'));

// ── CORS ────────────────────────────────
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000,http://localhost:5000').split(',');

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    const isAllowed = allowedOrigins.includes(origin) || 
                      origin.endsWith('.vercel.app') || 
                      process.env.NODE_ENV === 'development';

    if (isAllowed) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: origin ${origin} not allowed`));
    }
  },
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type'],
}));

// ── Rate limiting ────────────────────────
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests — please try again in 15 minutes.' },
});
app.use('/api/', limiter);

// ── Body parsing ─────────────────────────
app.use(express.json({ limit: '1mb' }));

// ── Routes ───────────────────────────────
app.use('/api', crawlRouter);

app.get('/health', (_, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// ── Global error handler ──────────────────
app.use(errorHandler);

// ── Start ────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅  SiteGrab Pro backend running on port ${PORT}`);
});

module.exports = app;
