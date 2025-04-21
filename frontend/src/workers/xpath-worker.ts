/**
 * Web Worker for evaluating XPath expressions using FontoXPath and slimdom
 */
import * as fontoxpath from 'fontoxpath';
import { DOMParser } from '@xmldom/xmldom';

// Create DOM node type constants since they might not be available in the worker context
const NODE_TYPES = {
  ELEMENT_NODE: 1,
  ATTRIBUTE_NODE: 2,
  TEXT_NODE: 3,
  CDATA_SECTION_NODE: 4,
  PROCESSING_INSTRUCTION_NODE: 7,
  COMMENT_NODE: 8,
  DOCUMENT_NODE: 9,
  DOCUMENT_TYPE_NODE: 10,
  DOCUMENT_FRAGMENT_NODE: 11,
};

// Worker message handlers
self.onmessage = async (event: MessageEvent) => {
  const { type, content, xpathExpression, isHtml } = event.data;

  if (type === 'evaluate') {
    try {
      const startTime = performance.now();
      const result = evaluateXPath(content, xpathExpression, isHtml);
      const endTime = performance.now();

      // Send results back to main thread
      self.postMessage({
        type: 'result',
        matches: result.matches,
        count: result.count,
        nodeTypes: result.nodeTypes,
        executionTime: endTime - startTime,
      });
    } catch (error: any) {
      self.postMessage({
        type: 'error',
        error: error.message || 'Unknown error evaluating XPath',
      });
    }
  }
};

interface MatchResult {
  value: string;
  nodeType?: number;
  nodeName?: string;
  startOffset?: number;
  endOffset?: number;
}

/**
 * Evaluates an XPath expression against XML/HTML content
 */
function evaluateXPath(
  content: string,
  xpathExpression: string,
  isHtml: boolean,
): {
  matches: Array<MatchResult>;
  count: number;
  nodeTypes: Record<string, number>;
} {
  const HTML_NS = 'http://www.w3.org/1999/xhtml';
  // Define namespace resolver function
  const namespaceResolver = (prefix: string): string | null => {
    // Return HTML namespace for all prefixes for better compatibility
    return HTML_NS;
  };

  // Parse the content to a DOM document
  const mimeType = isHtml ? 'text/html' : 'application/xml';
  const document = new DOMParser().parseFromString(content, mimeType);

  // Evaluate the XPath to get nodes directly - skip type detection for performance
  const matchingNodes = fontoxpath.evaluateXPathToNodes(xpathExpression, document, null, null, {
    namespaceResolver,
  });

  // Keep track of node types found
  const nodeTypes: Record<string, number> = {};

  // Extract values from matching nodes
  const matches = matchingNodes.map((node: any) => {
    // Count node types
    const nodeType = node.nodeType || 0;
    const typeName = getNodeTypeName(nodeType);
    nodeTypes[typeName] = (nodeTypes[typeName] || 0) + 1;
    
    return {
      value: extractNodeValue(node),
      nodeType: nodeType,
      nodeName: node.nodeName || '',
    };
  });

  return {
    matches,
    count: matches.length,
    nodeTypes,
  };
}

/**
 * Extract appropriate string value from a node based on its type
 */
function extractNodeValue(node: any): string {
  switch (node.nodeType) {
    case NODE_TYPES.ELEMENT_NODE:
      return node.outerHTML || node.toString();
    case NODE_TYPES.TEXT_NODE:
    case NODE_TYPES.CDATA_SECTION_NODE:
      return node.nodeValue || '';
    case NODE_TYPES.ATTRIBUTE_NODE:
      return node.value || '';
    case NODE_TYPES.COMMENT_NODE:
      return `<!--${node.nodeValue || ''}-->`;
    case NODE_TYPES.PROCESSING_INSTRUCTION_NODE:
      return `<?${node.target || ''} ${node.nodeValue || ''}?>`;
    default:
      return node.toString();
  }
}

/**
 * Get node type name from its numeric type
 */
function getNodeTypeName(nodeType: number): string {
  switch (nodeType) {
    case NODE_TYPES.ELEMENT_NODE:
      return 'ELEMENT_NODE';
    case NODE_TYPES.ATTRIBUTE_NODE:
      return 'ATTRIBUTE_NODE';
    case NODE_TYPES.TEXT_NODE:
      return 'TEXT_NODE';
    case NODE_TYPES.CDATA_SECTION_NODE:
      return 'CDATA_SECTION_NODE';
    case NODE_TYPES.PROCESSING_INSTRUCTION_NODE:
      return 'PROCESSING_INSTRUCTION_NODE';
    case NODE_TYPES.COMMENT_NODE:
      return 'COMMENT_NODE';
    case NODE_TYPES.DOCUMENT_NODE:
      return 'DOCUMENT_NODE';
    case NODE_TYPES.DOCUMENT_TYPE_NODE:
      return 'DOCUMENT_TYPE_NODE';
    case NODE_TYPES.DOCUMENT_FRAGMENT_NODE:
      return 'DOCUMENT_FRAGMENT_NODE';
    default:
      return 'UNKNOWN_NODE';
  }
}
