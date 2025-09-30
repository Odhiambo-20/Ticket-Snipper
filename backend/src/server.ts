import dotenv from 'dotenv';
import path from 'path';
import express from 'express';
import cors from 'cors';
import paymentRoutes from './routes/payments';
import showsRoutes from './routes/shows';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

// Validate critical environment variables
const requiredEnvVars = ['SEATGEEK_CLIENT_ID', 'SEATGEEK_CLIENT_SECRET', 'STRIPE_SECRET_KEY', 'TICKET_API_KEY', 'FRONTEND_URL'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  console.error('❌ ERROR: Missing required environment variables:');
  missingEnvVars.forEach(varName => console.error(`   - ${varName}`));
  console.error('\nPlease check your .env file and ensure all required variables are set.');
  process.exit(1);
}

// Parse allowed origins
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
  'http://localhost:8081',
  'exp://10.0.2.2:8081',
  'exp://192.168.195.87:8081',
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log('⚠️ Blocked by CORS:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Ticket Sniper API',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    integrations: {
      seatgeek: process.env.SEATGEEK_CLIENT_ID && process.env.SEATGEEK_CLIENT_SECRET ? 'configured' : 'not configured',
      stripe: process.env.STRIPE_SECRET_KEY ? 'configured' : 'not configured',
    },
    endpoints: {
      health: 'GET /health',
      shows: {
        list: 'GET /api/shows',
        details: 'GET /api/shows/:id',
        reserve: 'POST /api/shows/:id/reserve',
      },
      payments: {
        createCheckoutSession: 'POST /api/payments/stripe/create-checkout-session',
        checkSession: 'GET /api/payments/stripe/session/:id',
        createIntent: 'POST /api/payments/stripe/create-intent',
        checkIntent: 'GET /api/payments/stripe/intent/:id',
      },
    },
  });
});

app.use('/api/payments', paymentRoutes);
app.use('/api/shows', showsRoutes);

app.get('/', (req, res) => {
  res.json({
    message: 'Ticket Sniper API',
    version: '1.0.0',
    documentation: '/health',
    timestamp: new Date().toISOString(),
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
    availableRoutes: [
      'GET  /',
      'GET  /health',
      'GET  /api/shows',
      'GET  /api/shows/:id',
      'POST /api/shows/:id/reserve',
      'POST /api/payments/stripe/create-checkout-session',
      'GET  /api/payments/stripe/session/:id',
      'POST /api/payments/stripe/create-intent',
      'GET  /api/payments/stripe/intent/:id',
    ],
  });
});

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('❌ Error:', err.message, err.stack);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message,
    timestamp: new Date().toISOString(),
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log('\n🚀 ================================');
  console.log('   Ticket Sniper Backend API');
  console.log('   ================================\n');
  console.log(`✅ Server running on http://0.0.0.0:${PORT}`);
  console.log(`✅ Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`✅ Health check: http://localhost:${PORT}/health\n`);
  console.log('📡 Access from:');
  console.log(`   - Localhost:          http://localhost:${PORT}`);
  console.log(`   - Android Emulator:   http://10.0.2.2:${PORT}`);
  console.log(`   - iOS Simulator:      http://localhost:${PORT}`);
  console.log(`   - Network devices:    http://<your-ip>:${PORT}\n`);
  console.log('🔌 Integrations:');
  console.log(`   - SeatGeek:   ${process.env.SEATGEEK_CLIENT_ID && process.env.SEATGEEK_CLIENT_SECRET ? '✅ Configured' : '❌ Not configured'}`);
  console.log(`   - Stripe:     ${process.env.STRIPE_SECRET_KEY ? '✅ Configured' : '❌ Not configured'}`);
  console.log(`   - Frontend:   ${process.env.FRONTEND_URL ? `✅ ${process.env.FRONTEND_URL}` : '❌ Not configured'}\n`);
  console.log('📍 Available Endpoints:');
  console.log('   GET  /health');
  console.log('   GET  /api/shows');
  console.log('   GET  /api/shows/:id');
  console.log('   POST /api/shows/:id/reserve');
  console.log('   POST /api/payments/stripe/create-checkout-session');
  console.log('   GET  /api/payments/stripe/session/:id');
  console.log('   POST /api/payments/stripe/create-intent');
  console.log('   GET  /api/payments/stripe/intent/:id\n');
  console.log('🔒 CORS Allowed Origins:');
  allowedOrigins.forEach(origin => console.log(`   - ${origin}`));
  console.log('\n================================\n');
});