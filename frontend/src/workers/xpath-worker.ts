/* eslint-disable no-restricted-globals */
import * as xpath from 'fontoxpath';

// Define message types
interface EvaluateMessage {
  type: 'evaluate';
  content: string;
  xpathExpression: string;
  isHtml: boolean;
}

interface ResultMessage {
  type: 'result';
  matches: Array<{
    value: string;
    path: string;
    startOffset?: number;
    endOffset?: number;
  }>;
  count: number;
  executionTime: number;
}

interface ErrorMessage {
  type: 'error';
  error: string;
}

type WorkerMessage = EvaluateMessage;
type WorkerResponse = ResultMessage | ErrorMessage;

// Setup event listener for messages
self.addEventListener('message', (event: MessageEvent<WorkerMessage>) => {
  const message = event.data;

  if (message.type === 'evaluate') {
    evaluateXPath(message.content, message.xpathExpression, message.isHtml);
  }
});

/**
 * Evaluates an XPath expression against XML/HTML content
 */
async function evaluateXPath(content: string, xpathExpression: string, isHtml: boolean) {
  try {
    const startTime = performance.now();

    // Parse content
    const parser = new DOMParser();
    const contentType = isHtml ? 'text/html' : 'text/xml';
    const doc = parser.parseFromString(content, contentType);

    // Evaluate XPath
    const evaluateOptions = {
      namespaceResolver: xpath.evaluateXPath.ANY_NAMESPACE,
    };

    const nodes = xpath.evaluateXPath(
      xpathExpression,
      doc,
      null,
      xpath.evaluateXPath.ANY_TYPE,
      evaluateOptions
    ) as Node[];

    // Process results
    const matches = Array.isArray(nodes)
      ? nodes.map(node => {
          const nodeValue = (node as Element).outerHTML || node.textContent || '';
          const nodePath = getNodePath(node);
          
          // Attempt to find the node position in the original content
          // This is a simplified implementation and might not be precise
          const startOffset = content.indexOf(nodeValue);
          const endOffset = startOffset + nodeValue.length;
          
          return {
            value: nodeValue,
            path: nodePath,
            startOffset: startOffset >= 0 ? startOffset : undefined,
            endOffset: startOffset >= 0 ? endOffset : undefined,
          };
        })
      : [];

    const executionTime = performance.now() - startTime;

    // Send results back to main thread
    const response: ResultMessage = {
      type: 'result',
      matches,
      count: matches.length,
      executionTime,
    };

    self.postMessage(response);
  } catch (error: any) {
    const errorResponse: ErrorMessage = {
      type: 'error',
      error: error.message || 'Unknown error evaluating XPath',
    };
    self.postMessage(errorResponse);
  }
}

/**
 * Gets the XPath expression for a node
 */
function getNodePath(node: Node): string {
  // This is a simplified implementation
  const paths: string[] = [];
  let current: Node | null = node;
  
  while (current && current.nodeType === Node.ELEMENT_NODE) {
    let index = 1;
    let sibling: Node | null = current.previousSibling;
    
    while (sibling) {
      if (sibling.nodeType === Node.ELEMENT_NODE && 
          sibling.nodeName === current.nodeName) {
        index++;
      }
      sibling = sibling.previousSibling;
    }
    
    const tagName = (current as Element).tagName.toLowerCase();
    paths.unshift(`${tagName}[${index}]`);
    current = current.parentNode;
  }
  
  return paths.length ? `/${paths.join('/')}` : '/';
}

// Export an empty object to make TypeScript happy with the module format
export {}; 