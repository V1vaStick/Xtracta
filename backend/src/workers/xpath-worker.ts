import { parentPort, workerData } from 'worker_threads';
import { DOMParser } from 'xmldom';
import * as xpath from 'xpath';

// Ensure we have the worker thread parent port
if (!parentPort) {
  throw new Error('This module must be run as a worker thread');
}

// Process the data received from the main thread
const { content, xpathExpression, isHtml } = workerData;

async function evaluateXPath() {
  try {
    const startTime = performance.now();

    // Parse document
    const parser = new DOMParser({
      errorHandler: {
        warning: () => {},
        error: (message) => console.error(message),
        fatalError: (message) => console.error(message)
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
          };
        })
      : [];

    const executionTime = performance.now() - startTime;

    // Send results back to the main thread
    parentPort?.postMessage({
      matches,
      count: matches.length,
      executionTime
    });
  } catch (error: any) {
    // Send error back to the main thread
    parentPort?.postMessage({
      error: error.message
    });
  }
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

// Start evaluation
evaluateXPath(); 