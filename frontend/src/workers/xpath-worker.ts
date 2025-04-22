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
 * Calculates the offset position of a node in the original content
 */
function calculateNodePosition(content: string, node: any): { startOffset: number; endOffset: number } {
  let startOffset = -1;
  let endOffset = -1;
  
  try {
    // Handle different node types
    if (node.nodeType === NODE_TYPES.ELEMENT_NODE) {
      const nodeName = node.nodeName.toLowerCase();
      const outerHTML = node.outerHTML || node.toString();
      
      // For more accurate element matching, use attributes and structure
      const attributes: string[] = [];
      if (node.attributes) {
        for (let i = 0; i < node.attributes.length; i++) {
          const attr = node.attributes[i];
          if (attr.name && attr.value) {
            attributes.push(`${attr.name}="${attr.value}"`);
          }
        }
      }
      
      // Create a more precise pattern based on tag name and attributes
      let pattern;
      if (attributes.length > 0) {
        // Sort attributes to match document order (helps with formatted vs unformatted content)
        const attrPattern = attributes
          .filter(attr => !attr.includes('xmlns:')) // Exclude namespace declarations which may differ
          .join('[^>]*');
        
        // Create a pattern that matches the tag with its attributes flexibly
        pattern = new RegExp(`<${nodeName}[^>]*${attrPattern}[^>]*>`, 'i');
      } else {
        // Simple tag with no attributes
        pattern = new RegExp(`<${nodeName}[^>]*>`, 'i');
      }
      
      // Find all matches of this pattern
      const matches: RegExpExecArray[] = [];
      let match;
      let searchContent = content;
      let accumulatedOffset = 0;
      
      // Find all possible matches in the content
      while ((match = pattern.exec(searchContent)) !== null) {
        matches.push({
          ...match,
          index: match.index + accumulatedOffset
        } as RegExpExecArray);
        
        // Move search position forward
        accumulatedOffset += match.index + match[0].length;
        searchContent = content.substring(accumulatedOffset);
        
        // Reset the regex to search from the new position
        pattern.lastIndex = 0;
        
        // Avoid infinite loops by limiting matches
        if (matches.length > 100) break;
      }
      
      // If we have potential matches, determine which one is our element
      if (matches.length > 0) {
        // If there's only one match, use it
        if (matches.length === 1) {
          startOffset = matches[0].index;
        } else {
          // For multiple matches, try to disambiguate by checking surrounding context
          // Extract some unique content from the element if possible
          const textContent = node.textContent?.trim().substring(0, 50);
          let bestMatchIndex = -1;
          let bestMatchScore = -1;
          
          for (let i = 0; i < matches.length; i++) {
            const matchPos = matches[i].index;
            let score = 0;
            
            // Check if there's relevant text content to match
            if (textContent && textContent.length > 0) {
              // Look for the text content after the start tag position
              const textSearchArea = content.substring(matchPos, matchPos + 1000);
              if (textSearchArea.includes(textContent)) {
                score += 50; // Strong indicator this is the right element
              }
            }
            
            // Check for child elements signature to help disambiguate
            // For example, if we know this element has specific children, check for those
            const childElements = node.getElementsByTagName('*');
            if (childElements.length > 0 && childElements.length < 10) {
              // Get first few child element tag names
              const childTags = Array.from(childElements)
                .slice(0, 3)
                .map((child: any) => child.nodeName.toLowerCase());
              
              // Look for these tags after the current match position
              const childSearchArea = content.substring(matchPos, matchPos + 500);
              const childMatches = childTags.filter(tag => 
                childSearchArea.includes(`<${tag}`)
              );
              
              // Score based on how many child tags we found
              score += (childMatches.length / childTags.length) * 30;
            }
            
            // If there are attributes with values, check for them
            if (attributes.length > 0) {
              // Check for exact attribute strings (more precise)
              const exactAttrMatch = attributes.filter(attr => 
                content.substring(matchPos - 10, matchPos + 100).includes(attr)
              );
              score += (exactAttrMatch.length / attributes.length) * 20;
            }
            
            // Track the best match
            if (score > bestMatchScore) {
              bestMatchScore = score;
              bestMatchIndex = i;
            }
          }
          
          // Use the best match if we found one, otherwise use the first match
          startOffset = matches[bestMatchIndex !== -1 ? bestMatchIndex : 0].index;
        }
        
        // Now find the end of the element using a better approach
        if (startOffset !== -1) {
          // Try to find the matching closing tag
          const closingTag = `</${nodeName}>`;
          const nodeStack: number[] = [];
          let searchFromIndex = startOffset;
          
          // Handle self-closing tags
          const openTag = content.substring(startOffset, startOffset + 100);
          if (openTag.match(/<[^>]*\/>/)) {
            // Self-closing tag, use the end of the opening tag
            const selfClosingEnd = content.indexOf('>', startOffset) + 1;
            if (selfClosingEnd > startOffset) {
              endOffset = selfClosingEnd;
            }
          } else {
            // Regular element with possible child elements - handle nesting
            // Find all opening and closing tags of this type
            const openTagRegex = new RegExp(`<${nodeName}(?:\\s+[^>]*?)?>`, 'g');
            const closeTagRegex = new RegExp(`</${nodeName}>`, 'g');
            
            let openMatch: RegExpExecArray | null;
            let closeMatch: RegExpExecArray | null;
            let openPositions: number[] = [];
            let closePositions: number[] = [];
            
            // Find all opening tags
            while ((openMatch = openTagRegex.exec(content)) !== null) {
              if (openMatch.index >= startOffset) {
                openPositions.push(openMatch.index);
              }
            }
            
            // Find all closing tags
            while ((closeMatch = closeTagRegex.exec(content)) !== null) {
              if (closeMatch.index >= startOffset) {
                closePositions.push(closeMatch.index);
              }
            }
            
            // Find matching closing tag using a stack approach
            let depth = 1; // Start with depth 1 (already found first opening tag)
            let matchingClosePos = -1;
            
            // Process events in order of position
            const events = [
              ...openPositions.map(pos => ({ pos, isOpen: true })),
              ...closePositions.map(pos => ({ pos, isOpen: false }))
            ].sort((a, b) => a.pos - b.pos);
            
            // Skip the first opening tag as it's our starting element
            let skipFirst = true;
            
            for (const event of events) {
              if (skipFirst && event.isOpen && event.pos === startOffset) {
                skipFirst = false;
                continue;
              }
              
              if (event.isOpen) {
                depth++;
              } else {
                depth--;
                if (depth === 0) {
                  // Found matching closing tag
                  matchingClosePos = event.pos;
                  break;
                }
              }
            }
            
            if (matchingClosePos > startOffset) {
              endOffset = matchingClosePos + closingTag.length;
            } else {
              // Fallback: if we can't find the proper closing tag, look for the next one
              const nextClosingTag = content.indexOf(closingTag, startOffset);
              if (nextClosingTag !== -1) {
                endOffset = nextClosingTag + closingTag.length;
              }
            }
          }
          
          // If we still don't have an end offset, use a simpler approach
          if (endOffset === -1 && outerHTML) {
            // Estimate end by finding an approximate match of the end portion of outerHTML
            const lastPartOfHTML = outerHTML.substring(outerHTML.length - Math.min(20, outerHTML.length));
            const approxEnd = content.indexOf(lastPartOfHTML, startOffset);
            if (approxEnd !== -1) {
              endOffset = approxEnd + lastPartOfHTML.length;
            } else {
              // Last resort: estimate based on outerHTML length
              endOffset = startOffset + outerHTML.length;
            }
          }
        }
      }
      
      // If we couldn't find the element, fall back to a simpler approach
      if (startOffset === -1 && outerHTML) {
        const startTagPattern = new RegExp(`<${nodeName}(\\s+[^>]*)?>`);
        const startMatch = startTagPattern.exec(content);
        
        if (startMatch) {
          startOffset = startMatch.index;
          endOffset = startOffset + outerHTML.length;
        }
      }
    } else if (node.nodeType === NODE_TYPES.TEXT_NODE) {
      // For text nodes, find the text content
      const textContent = node.nodeValue || '';
      if (textContent.trim()) {
        // Problem with duplicate text - try to use parent element context
        let parentNode = node.parentNode;
        let parentContext = '';
        
        if (parentNode && parentNode.nodeName) {
          // Get first part of parent tag to help locate the correct text instance
          parentContext = `<${parentNode.nodeName.toLowerCase()}`;
          
          // Find parent tag in content
          const parentPos = content.indexOf(parentContext);
          if (parentPos !== -1) {
            // Search for text only after parent start
            const contextEnd = content.indexOf('>', parentPos) + 1;
            const searchStart = Math.max(0, contextEnd);
            const searchArea = content.substring(searchStart);
            
            // Now look for text in the context of its parent
            const textPos = searchArea.indexOf(textContent);
            if (textPos !== -1) {
              startOffset = searchStart + textPos;
              endOffset = startOffset + textContent.length;
            }
          }
        }
        
        // Fallback if parent context didn't help
        if (startOffset === -1) {
          // Try multiple occurrences to find the right one
          const textPositions: number[] = [];
          let searchPos = 0;
          let foundPos;
          
          // Find all occurrences of this text
          while ((foundPos = content.indexOf(textContent, searchPos)) !== -1) {
            textPositions.push(foundPos);
            searchPos = foundPos + 1;
          }
          
          if (textPositions.length === 1) {
            // Only one instance found
            startOffset = textPositions[0];
            endOffset = startOffset + textContent.length;
          } else if (textPositions.length > 1) {
            // Multiple instances - try to disambiguate using surrounding context
            // For now, just take the first occurrence as a fallback
            startOffset = textPositions[0];
            endOffset = startOffset + textContent.length;
          }
        }
      }
    } else if (node.nodeType === NODE_TYPES.ATTRIBUTE_NODE) {
      // For attributes, find the attribute in the content
      const attrName = node.nodeName;
      const attrValue = node.nodeValue;
      
      // Look for attribute pattern like name="value" or name='value'
      const attrPattern = new RegExp(`${attrName}\\s*=\\s*["']${attrValue}["']`);
      const match = attrPattern.exec(content);
      
      if (match) {
        startOffset = match.index;
        endOffset = startOffset + match[0].length;
      }
    }
  } catch (error) {
    console.error('Error calculating node position:', error);
  }
  
  return { startOffset, endOffset };
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
    
    // Calculate node position in the content
    const { startOffset, endOffset } = calculateNodePosition(content, node);
    
    return {
      value: extractNodeValue(node),
      nodeType: nodeType,
      nodeName: node.nodeName || '',
      startOffset,
      endOffset
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
