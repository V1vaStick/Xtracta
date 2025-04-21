import { DOMParser } from 'xmldom';
import * as xpath from 'xpath';
import { Worker } from 'worker_threads';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get current file path for worker relative path resolution
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Type definitions
interface XPathResult {
  matches: Array<{
    value: string;
    path: string;
    startOffset?: number;
    endOffset?: number;
  }>;
  count: number;
  executionTime: number;
}

/**
 * Evaluates an XPath expression against XML/HTML content
 * Uses worker thread for large documents
 */
export async function evaluateXPathOnDocument(
  content: string, 
  xpathExpression: string, 
  isHtml: boolean = false
): Promise<XPathResult> {
  // For large documents (> 5MB), use worker thread
  if (content.length > 5 * 1024 * 1024) {
    return evaluateInWorker(content, xpathExpression, isHtml);
  }
  
  // For smaller documents, evaluate directly
  return evaluateXPathDirectly(content, xpathExpression, isHtml);
}

/**
 * Evaluates XPath directly in the main thread
 */
function evaluateXPathDirectly(
  content: string, 
  xpathExpression: string, 
  isHtml: boolean = false
): Promise<XPathResult> {
  return new Promise((resolve, reject) => {
    try {
      const startTime = performance.now();
      
      // Parse document
      const parser = new DOMParser({
        errorHandler: {
          warning: () => {},
          error: reject,
          fatalError: reject
        }
      });
      
      const doc = isHtml 
        ? parser.parseFromString(content, 'text/html')
        : parser.parseFromString(content, 'text/xml');
      
      // Evaluate XPath
      const nodes = xpath.select(xpathExpression, doc);
      
      // Process results
      const matches = Array.isArray(nodes) 
        ? nodes.map(node => {
            const nodeValue = (node as any).nodeValue || (node as any).textContent || '';
            const nodePath = getNodePath(node as Node);
            
            return {
              value: nodeValue.trim(),
              path: nodePath,
              // Note: Offset calculation is approximate and would need refinement
              // for exact positioning in the original document
            };
          })
        : [];
        
      const executionTime = performance.now() - startTime;
      
      resolve({
        matches,
        count: matches.length,
        executionTime
      });
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Evaluates XPath in a worker thread
 */
function evaluateInWorker(
  content: string, 
  xpathExpression: string, 
  isHtml: boolean = false
): Promise<XPathResult> {
  return new Promise((resolve, reject) => {
    try {
      const workerPath = join(__dirname, '../workers/xpath-worker.js');
      const worker = new Worker(workerPath, {
        workerData: {
          content,
          xpathExpression,
          isHtml
        }
      });
      
      worker.on('message', (result) => {
        resolve(result);
        worker.terminate();
      });
      
      worker.on('error', (err) => {
        reject(err);
        worker.terminate();
      });
      
      worker.on('exit', (code) => {
        if (code !== 0) {
          reject(new Error(`Worker stopped with exit code ${code}`));
        }
      });
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Gets the XPath expression for a node
 */
function getNodePath(node: Node): string {
  // This is a simplified implementation
  // A more robust solution would consider node types, namespaces, etc.
  let path = '';
  let current: Node | null = node;
  
  while (current && current.nodeType === 1) {
    let index = 1;
    let sibling: Node | null = current.previousSibling;
    
    while (sibling) {
      if (sibling.nodeType === 1 && (sibling as Element).tagName === (current as Element).tagName) {
        index++;
      }
      sibling = sibling.previousSibling;
    }
    
    const tagName = (current as Element).tagName.toLowerCase();
    path = `/${tagName}[${index}]${path}`;
    current = current.parentNode;
  }
  
  return path || '/';
} 