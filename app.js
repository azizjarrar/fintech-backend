require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const connectDb = require('./app/config/connect_db');
const errorHandler = require('./app/config/error_handler');
const terminate = require('./app/config/terminate');
const autoFill = require('./app/lib/auto_fill');
const path = require('path'); // Add path module

// Routes
const authRoute = require('./app/routes/auth_route');
const application_route = require('./app/routes/application_route');
const notification_route = require('./app/routes/notification_route');


// Create Express app
const app = express();
app.disable('x-powered-by');

// --- Middleware ---
app.use(helmet());                                    
app.use(morgan('dev'));                         
app.use(express.json());                            

// CORS configuration
const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
];
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);

// --- Routes ---
app.use('/auth', authRoute);
app.use('/application', application_route);
app.use('/notification', notification_route);
app.use('/uploads', express.static(path.join(__dirname, 'app/uploads')));


// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    environment: process.env.NODE_ENV,
    uptime: process.uptime(),
  });
});

// --- Error Handling ---
app.use(errorHandler);
app.use((req, res) => {
  res.status(404).json({ error: 'Page not found' });
});

// --- Start Server ---
(async () => {
  try {
    await connectDb();
    console.log('Connected to database');

    // Seed initial data
    await autoFill();
    console.log('Auto-fill completed');

    const PORT = process.env.PORT || 5000;
    const server = app.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`);
    });

    // Graceful shutdown
    const exitHandler = terminate({ server, timeout: 500 });
    process.on('SIGINT', exitHandler(0, 'SIGINT received'));
    process.on('SIGTERM', exitHandler(0, 'SIGTERM received'));
    process.on('uncaughtException', exitHandler(1, 'Uncaught Exception'));
    process.on('unhandledRejection', exitHandler(1, 'Unhandled Rejection'));
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
})();
