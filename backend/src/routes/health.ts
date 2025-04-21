/**
 * Health check route for Xtracta backend
 */
import { Router, Request, Response } from 'express';

const router = Router();

/**
 * GET /api/health
 * Health check endpoint for monitoring and Docker health checks
 */
router.get('/', (_req: Request, res: Response) => {
  // Get the package.json version
  const version = process.env.npm_package_version || '1.0.0';
  
  // Calculate uptime in seconds
  const uptimeSeconds = Math.floor(process.uptime());
  
  // Return health information
  return res.status(200).json({
    status: 'healthy',
    version,
    uptime: uptimeSeconds,
    timestamp: new Date().toISOString(),
    memory: {
      heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
      heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + 'MB',
    }
  });
});

export default router; 