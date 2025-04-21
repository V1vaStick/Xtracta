import { Router } from 'express';
import { body } from 'express-validator';
import { evaluateXPath } from '../controllers/xpath.js';

const router = Router();

/**
 * POST /api/xpath/evaluate
 * Evaluates XPath expression against provided XML/HTML content
 */
router.post(
  '/evaluate',
  [
    body('content').notEmpty().withMessage('Content is required'),
    body('xpath').notEmpty().withMessage('XPath expression is required'),
    body('isHtml').isBoolean().optional(),
  ],
  evaluateXPath,
);

export default router; 