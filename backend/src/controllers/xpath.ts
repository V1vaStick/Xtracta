import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { evaluateXPathOnDocument } from '../services/xpath-service.js';

/**
 * Evaluates an XPath expression against XML/HTML content
 */
export const evaluateXPath = async (req: Request, res: Response) => {
  // Validate request
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { content, xpath, isHtml = false } = req.body;

    // Evaluate XPath
    const results = await evaluateXPathOnDocument(content, xpath, isHtml);

    // Return results
    return res.status(200).json({
      matches: results.matches,
      count: results.count,
      executionTime: results.executionTime,
    });
  } catch (error: any) {
    console.error('XPath evaluation error:', error);
    return res.status(500).json({ 
      error: 'Error evaluating XPath expression',
      details: error.message
    });
  }
}; 