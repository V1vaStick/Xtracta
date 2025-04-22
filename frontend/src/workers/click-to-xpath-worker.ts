/**
 * Web Worker for handling click-to-XPath functionality
 * Moves heavy computation off the main thread to prevent UI freezing
 * with large HTML documents.
 */
import { DOMParser } from '@xmldom/xmldom';

// Define types
interface ElementMatch {
  tagName: string;
  attributes: Record<string, string>;
  startIndex: number;
  endIndex: number;
}

interface ClickRequest {
  id: number; // To handle race conditions
  content: string;
  lineNumber: number;
  column: number;
  clickedLine: string;
  approximatePosition: number;
  surroundingLines?: string;
}

// Define DOM types for xmldom (different from browser DOM)
type XmlDomDocument = ReturnType<DOMParser['parseFromString']>;
type XmlDomElement = XmlDomDocument['documentElement'];

/**
 * Helper function to find element at a specific position in a line
 */
const findElementAtPosition = (line: string, column: number): ElementMatch | null => {
  // Improved regex to better capture HTML/XML tags, including self-closing tags and tags with complex attributes
  const tagRegex = /<([a-zA-Z0-9_:-]+)([^>]*?)(\/?)>/g;
  let match;
  
  while ((match = tagRegex.exec(line)) !== null) {
    const startIndex = match.index;
    const endIndex = startIndex + match[0].length;
    
    if (column >= startIndex && column <= endIndex) {
      const tagName = match[1];
      const attributesStr = match[2].trim();
      const attributes: Record<string, string> = {};
      
      // Improved attribute parsing regex that handles various attribute formats
      const attrRegex = /([a-zA-Z0-9_:-]+)(?:=(?:"([^"]*)"|'([^']*)'|([^\s>]*))?)?/g;
      let attrMatch;
      
      while ((attrMatch = attrRegex.exec(attributesStr)) !== null) {
        if (attrMatch[1]) { // Attribute name exists
          // Get the value from whichever capture group matched (double quotes, single quotes, or no quotes)
          const value = attrMatch[2] || attrMatch[3] || attrMatch[4] || '';
          attributes[attrMatch[1]] = value;
        }
      }
      
      return { tagName, attributes, startIndex, endIndex };
    }
  }
  
  // If no opening tag is found, try to find a closing tag
  const closingTagRegex = /<\/([a-zA-Z0-9_:-]+)>/g;
  while ((match = closingTagRegex.exec(line)) !== null) {
    const startIndex = match.index;
    const endIndex = startIndex + match[0].length;
    
    if (column >= startIndex && column <= endIndex) {
      const tagName = match[1];
      return { tagName, attributes: {}, startIndex, endIndex };
    }
  }
  
  return null;
};

/**
 * Helper function to find element in parsed DOM that matches the clicked location in source
 */
const findElementInDocument = (
  doc: XmlDomDocument, 
  tagName: string, 
  attributes: Record<string, string>,
  sourceContent: string,
  approximateSourcePosition: number
): XmlDomElement | null => {
  // First try to find by ID if available
  if (attributes.id) {
    const elementById = doc.getElementById(attributes.id);
    if (elementById && elementById.tagName.toLowerCase() === tagName.toLowerCase()) {
      return elementById;
    }
  }
  
  // Extract section of source content around click position for context matching
  const contextStart = Math.max(0, approximateSourcePosition - 500);
  const contextEnd = Math.min(sourceContent.length, approximateSourcePosition + 500);
  const contextWindow = sourceContent.substring(contextStart, contextEnd).toLowerCase();
  
  // Get all elements of this tag type
  const elements = Array.from(doc.getElementsByTagName(tagName));
  
  if (elements.length === 0) {
    return null;
  }
  
  // If there's only one element of this type, use it
  if (elements.length === 1) {
    return elements[0];
  }
  
  // Try to match by attributes first
  const matchingElements = elements.filter(element => {
    let matchCount = 0;
    let totalAttributes = 0;
    
    for (const [key, value] of Object.entries(attributes)) {
      if (value) { // Only check non-empty attributes
        totalAttributes++;
        if (element.getAttribute(key) === value) {
          matchCount++;
        }
      }
    }
    
    // If we have attributes to match and most match, keep this element
    return totalAttributes > 0 ? (matchCount / totalAttributes) > 0.5 : true;
  });
  
  if (matchingElements.length === 1) {
    return matchingElements[0];
  }
  
  // Score each element based on multiple criteria
  type ScoredElement = { element: XmlDomElement; score: number };
  const scoredElements: ScoredElement[] = [];
  
  // Use the selection of elements we've filtered down to, or all of them if we have no filtered set
  const candidateElements = matchingElements.length > 0 ? matchingElements : elements;
  
  for (const element of candidateElements) {
    let score = 0;
    
    // 1. Build the ancestral path to help with identification
    const ancestorPath: string[] = [];
    let current: XmlDomElement | null = element;
    
    while (current) {
      // Get tag and class names for better context
      const tag = current.tagName.toLowerCase();
      
      // Add class for more specific matching if available
      const className = current.getAttribute('class');
      ancestorPath.unshift(className ? `${tag}.${className}` : tag);
      
      // Include content for text-bearing elements
      const textContent = current.textContent?.trim().slice(0, 20);
      if (textContent && textContent.length > 0) {
        ancestorPath[0] += `:contains("${textContent}")`;
      }
      
      current = current.parentElement as XmlDomElement | null;
    }
    
    // 2. Create a full context path from the ancestry
    const fullPath = ancestorPath.join('/');
    
    // 3. Check for specific contexts that could help disambiguate
    const isInSidebar = fullPath.includes('sidebar') || 
                         fullPath.includes('side-bar') || 
                         ancestorPath.some(p => p.includes('sidebar'));
    
    const isInNav = fullPath.includes('nav') || 
                    fullPath.includes('navigation') || 
                    ancestorPath.some(p => p.includes('nav'));
    
    const isInHeader = fullPath.includes('header') || 
                       ancestorPath.some(p => p.includes('header'));
    
    const isInFooter = fullPath.includes('footer') || 
                       ancestorPath.some(p => p.includes('footer'));
                     
    const isInContent = fullPath.includes('content') || 
                        fullPath.includes('main') || 
                        ancestorPath.some(p => p.includes('content') || p.includes('main'));
    
    // 4. Evaluate the position context in the source document to find the best match
    const pathStr = ancestorPath.slice(Math.max(0, ancestorPath.length - 4)).join('');
    const normalizedPath = pathStr.replace(/[^a-z0-9]/g, '').toLowerCase();
    
    // Search for this path pattern in the context window
    let pathFound = false;
    let distanceToClick = Number.MAX_SAFE_INTEGER;
    
    if (normalizedPath.length > 0) {
      // Try to find the pattern in the context window
      const pathPos = contextWindow.indexOf(normalizedPath);
      if (pathPos !== -1) {
        pathFound = true;
        // Calculate distance to clicked position
        distanceToClick = Math.abs((pathPos + contextStart) - approximateSourcePosition);
      }
    }
    
    // 5. Score this element based on all factors
    
    // Context score - based on meaningful container elements
    if (contextWindow.includes('sidebar') && isInSidebar) {
      score += 20; // Strongly prioritize sidebar elements if the context includes sidebar
    } else if (contextWindow.includes('related') && isInSidebar) {
      score += 15; // Related links context hints at sidebar
    } else if (contextWindow.includes('nav') && isInNav) {
      score += 10;
    } else if (contextWindow.includes('header') && isInHeader) {
      score += 10;
    } else if (contextWindow.includes('content') && isInContent) {
      score += 15;
    }
    
    // Direct element context
    const elementOuterHtml = element?.toString().toLowerCase() || '';
    const immediateContextRegex = new RegExp(`<[^>]*${tagName.toLowerCase()}[^>]*>([^<]{0,50})`, 'i');
    const immediateMatch = immediateContextRegex.exec(contextWindow);
    
    if (immediateMatch && elementOuterHtml.includes(immediateMatch[1])) {
      score += 30; // Very strong signal if immediate text content matches
    }
    
    // Distance-based score - closer elements get higher scores
    if (pathFound) {
      // Logarithmic scoring - lower distance is better
      const distanceScore = 100 - Math.min(100, Math.log(distanceToClick + 1) * 10);
      score += distanceScore;
    } else {
      // If path not found, heavily penalize
      score -= 50;
    }
    
    // Ancestors with IDs are more reliable indicators
    if (ancestorPath.some(p => p.includes('#'))) {
      score += 15;
    }
    
    // Nearest ancestor with an ID is likely the most relevant container
    const nearestParentWithId = findNearestParentWithId(element);
    if (nearestParentWithId && nearestParentWithId.getAttribute('id') === 'content') {
      score += 25; // Strongly prefer elements in the content area
    } else if (nearestParentWithId && nearestParentWithId.getAttribute('id') === 'root') {
      score += 5; // Root is less specific but still useful
    }
    
    // Content areas with links are more likely to be the sidebar
    if (isInSidebar && fullPath.includes('li') && fullPath.includes('a')) {
      score += 10;
    }
    
    // Only add the element to scored elements if it's not null
    if (element) {
      scoredElements.push({ element, score });
    }
  }
  
  // Sort by score descending and get the best match
  scoredElements.sort((a, b) => b.score - a.score);
  
  if (scoredElements.length > 0) {
    const bestMatch = scoredElements[0].element;
    return bestMatch;
  }
  
  // Fallback
  return matchingElements[0] || elements[0];
};

/**
 * Helper function to find the nearest parent with an ID attribute
 */
const findNearestParentWithId = (element: XmlDomElement): XmlDomElement | null => {
  let current: XmlDomElement | null = element;
  
  while (current) {
    if (current.getAttribute('id')) {
      return current;
    }
    current = current.parentElement as XmlDomElement | null;
  }
  
  return null;
};

/**
 * Helper function to generate XPath using the simplified approach
 */
const generateXPath = (element: XmlDomElement): string => {
  if (!element) {
    return '';
  }
  
  // If the element itself has an ID, just use that (most specific)
  const id = element.getAttribute('id');
  if (id) {
    return `//*[@id="${id}"]`;
  }
  
  // Check for parent elements with ID to create a relative path
  let current: XmlDomElement | null = element;
  let idFound = false;
  
  while (current && !idFound) {
    const parent: XmlDomElement | null = current.parentElement as XmlDomElement | null;
    
    if (!parent) break;
    
    const parentId = parent.getAttribute('id');
    if (parentId) {
      // Found a parent with ID, build path from here
      idFound = true;
      
      // Calculate the path from this ID to our target element
      const pathParts: string[] = [];
      let pathCurrent: XmlDomElement | null = element;
      
      while (pathCurrent && pathCurrent !== parent) {
        const tagName = pathCurrent.tagName.toLowerCase();
        const parentElement = pathCurrent.parentElement as XmlDomElement | null;
        
        if (!parentElement) break;
        
        const siblings = Array.from(parentElement.childNodes)
          .filter(child => {
            if (!child || child.nodeType !== 1) return false;
            const tagNameLower = (child as XmlDomElement).tagName?.toLowerCase();
            return tagNameLower === tagName;
          });
        
        if (siblings.length > 1) {
          // Need position index for disambiguation
          const position = siblings.indexOf(pathCurrent) + 1;
          pathParts.unshift(`/${tagName}[${position}]`);
        } else {
          pathParts.unshift(`/${tagName}`);
        }
        
        pathCurrent = pathCurrent.parentElement as XmlDomElement | null;
      }
      
      return `//*[@id="${parentId}"]${pathParts.join('')}`;
    }
    
    current = parent;
  }
  
  // If no ID found, build absolute path
  const parts: string[] = [];
  current = element;
  
  while (current) {
    const tagName = current.tagName.toLowerCase();
    const parent: XmlDomElement | null = current.parentElement as XmlDomElement | null;
    
    if (parent) {
      // Check if we need position index
      const siblings = Array.from(parent.childNodes).filter(child => {
        if (!child || child.nodeType !== 1) return false;
        const tagNameLower = (child as XmlDomElement).tagName?.toLowerCase();
        return tagNameLower === tagName;
      });
      
      if (siblings.length > 1) {
        const position = siblings.indexOf(current) + 1;
        parts.unshift(`/${tagName}[${position}]`);
      } else {
        parts.unshift(`/${tagName}`);
      }
    } else {
      parts.unshift(`/${tagName}`);
    }
    
    current = parent;
  }
  
  return parts.join('');
};

/**
 * Handle click-to-XPath requests
 */
const handleClickToXPath = (request: ClickRequest): { id: number; xpath: string | null; error?: string } => {
  try {
    // Create a temporary DOM parser to handle the XML content
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(request.content, 'text/html');
    
    // Try normal element detection first
    let elementMatch = findElementAtPosition(request.clickedLine, request.column);
    
    // If normal detection fails, try to handle multi-line tags
    if (!elementMatch && request.clickedLine.includes('<') && !request.clickedLine.includes('>') && request.surroundingLines) {
      // Try to find partial tag match in the clicked line
      const tagStartMatch = /<([a-zA-Z0-9_:-]+)([^>]*?)$/g.exec(request.clickedLine);
      if (tagStartMatch) {
        const tagName = tagStartMatch[1];
        const partialAttrs = tagStartMatch[2];
        
        // Try to find complete tag in combined lines
        const fullTagRegex = new RegExp(`<${tagName}[^>]*?>`, 'g');
        const fullTagMatch = fullTagRegex.exec(request.surroundingLines);
        
        if (fullTagMatch) {
          elementMatch = findElementAtPosition(fullTagMatch[0], fullTagMatch[0].indexOf(' ') + 1);
        } else {
          // Extract attributes from the partial tag
          const attributes: Record<string, string> = {};
          
          // Process partial attributes
          const attrRegex = /([a-zA-Z0-9_:-]+)(?:=(?:"([^"]*)"|'([^']*)'|([^\s>]*))?)?/g;
          let attrMatch;
          
          while ((attrMatch = attrRegex.exec(partialAttrs)) !== null) {
            if (attrMatch[1]) {
              const value = attrMatch[2] || attrMatch[3] || attrMatch[4] || '';
              attributes[attrMatch[1]] = value;
            }
          }
          
          // Use partial info to create elementMatch
          elementMatch = { tagName, attributes, startIndex: -1, endIndex: -1 };
        }
      }
    }
    
    if (elementMatch) {
      const { tagName, attributes } = elementMatch;
      
      // Try to find the element in the parsed DOM using source position info
      const elementInDoc = findElementInDocument(
        xmlDoc, 
        tagName, 
        attributes, 
        request.content, 
        request.approximatePosition
      );
      
      if (elementInDoc) {
        // Generate XPath with improved approach
        const xpath = generateXPath(elementInDoc);
        return { id: request.id, xpath };
      } else {
        return { id: request.id, xpath: null, error: 'No element found in document for clicked position' };
      }
    } else {
      return { id: request.id, xpath: null, error: 'No element found at the clicked position' };
    }
  } catch (error: any) {
    return { 
      id: request.id, 
      xpath: null, 
      error: error.message || 'Unknown error generating XPath' 
    };
  }
};

// Worker message handler
self.onmessage = (event: MessageEvent) => {
  const request = event.data as ClickRequest;
  
  if (request) {
    // Process the click request
    const result = handleClickToXPath(request);
    
    // Send result back to main thread
    self.postMessage(result);
  }
}; 