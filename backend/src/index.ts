import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { rateLimit } from 'express-rate-limit';

// Routes import
import xpathRoutes from './routes/xpath.js';
import healthRoutes from './routes/health.js';

// Services import
import { startScheduledBackups } from './services/backup-service.js';

// Configure environment
const PORT = process.env.PORT || 3001;
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3000';
const BACKUP_INTERVAL = process.env.BACKUP_INTERVAL_HOURS 
  ? parseInt(process.env.BACKUP_INTERVAL_HOURS, 10) * 60 * 60 * 1000 
  : undefined; // Default is 24 hours, defined in the backup service

// Create Express app
const app = express();

// Middleware
app.use(helmet());
app.use(
  cors({
    origin: CORS_ORIGIN,
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
  }),
);
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));
app.use(morgan('dev'));

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(apiLimiter);

// Routes
app.use('/api/xpath', xpathRoutes);
app.use('/api/health', healthRoutes);

// Legacy health check (to be removed in future versions)
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
});

// Start scheduled backups
if (process.env.ENABLE_BACKUPS !== 'false') {
  startScheduledBackups(BACKUP_INTERVAL);
  console.log('Automated backups enabled');
}

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check endpoint available at http://localhost:${PORT}/api/health`);
}); 