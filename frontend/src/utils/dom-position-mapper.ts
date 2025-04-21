/**
 * Utility functions for mapping positions in HTML/XML text to DOM nodes
 * and generating XPath expressions
 */

// Define XPath format types
export enum XPathFormat {
  ABSOLUTE = 'absolute',  // Full path from root: /html/body/div[1]/p[2]
  ID_BASED = 'id-based',  // Shortest path using IDs: //div[@id='content']/p[2]
  SHORT = 'short',        // Shortened path with // where possible: //p[@class='info']
}

interface XPathResult {
  xpath: string;
  element: string;
  node: Node;
  // Add alternative XPath expressions
  alternativeXPaths: Record<XPathFormat, string>;
}

/**
 * Finds the DOM node at a specific character offset in the content string
 * and generates an XPath expression for it
 *
 * @param doc - The parsed DOM document
 * @param content - The source HTML/XML content as a string
 * @param offset - The character offset in the source string
 * @returns The XPath result object or null if no node found
 */
export const generateXPathForPosition = (
  doc: Document,
  content: string,
  offset: number
): XPathResult | null => {
  // Find the node at the given position
  const node = findNodeAtOffset(doc, content, offset);
  if (!node) return null;

  // Generate different XPath expressions for the node
  const absoluteXPath = generateXPathForNode(node, XPathFormat.ABSOLUTE);
  const idBasedXPath = generateXPathForNode(node, XPathFormat.ID_BASED);
  const shortXPath = generateXPathForNode(node, XPathFormat.SHORT);
  
  // Get a readable element name for display
  const element = getElementDisplayName(node);

  return {
    xpath: idBasedXPath, // Default to ID-based path as the primary XPath
    element,
    node,
    alternativeXPaths: {
      [XPathFormat.ABSOLUTE]: absoluteXPath,
      [XPathFormat.ID_BASED]: idBasedXPath,
      [XPathFormat.SHORT]: shortXPath,
    }
  };
};

/**
 * Finds the DOM node at a specific character offset
 *
 * @param doc - The parsed DOM document
 * @param content - The source content as a string
 * @param offset - The character offset
 * @returns The DOM node at the given offset or null if not found
 */
export const findNodeAtOffset = (
  doc: Document,
  content: string,
  offset: number
): Node | null => {
  // Edge case checks
  if (!doc || offset < 0 || offset >= content.length) {
    return null;
  }

  // We'll use a tree walker to traverse all nodes and check their positions
  const walker = document.createTreeWalker(
    doc,
    NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
    null
  );

  // Start from the document and search for the node that contains the offset
  let node: Node | null = walker.currentNode;
  let bestMatchNode: Node | null = null;
  let bestMatchStart = -1;
  let bestMatchEnd = -1;

  // Track positions in the original string
  let currentOffset = 0;
  
  while (node) {
    let nodeStart = -1;
    let nodeEnd = -1;
    
    // Handle different node types
    if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as Element;
      const outerHTML = element.outerHTML;
      if (!outerHTML) {
        node = walker.nextNode();
        continue;
      }
      
      // Find this element's position in the content
      nodeStart = content.indexOf(outerHTML, currentOffset);
      if (nodeStart === -1) {
        // If exact match fails, try a more flexible approach
        // (This is a simplified approximation; a production implementation would be more robust)
        const openTag = `<${element.tagName.toLowerCase()}`;
        nodeStart = content.indexOf(openTag, currentOffset);
      }
      
      if (nodeStart !== -1) {
        nodeEnd = nodeStart + element.outerHTML.length;
        
        // Update tracking position if we found a match
        currentOffset = Math.max(currentOffset, nodeEnd);
      }
    } else if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent || '';
      if (text.trim()) {
        nodeStart = content.indexOf(text, currentOffset);
        if (nodeStart !== -1) {
          nodeEnd = nodeStart + text.length;
          currentOffset = Math.max(currentOffset, nodeEnd);
        }
      }
    }
    
    // Check if this node contains our target offset
    if (nodeStart !== -1 && nodeEnd !== -1 && 
        offset >= nodeStart && offset <= nodeEnd) {
      // Update best match if this node is a better match (more specific)
      if (bestMatchNode === null || 
          (nodeEnd - nodeStart) < (bestMatchEnd - bestMatchStart)) {
        bestMatchNode = node;
        bestMatchStart = nodeStart;
        bestMatchEnd = nodeEnd;
      }
    }
    
    // Move to next node
    node = walker.nextNode();
  }
  
  // Return the best matching node
  return bestMatchNode;
};

/**
 * Generates an XPath expression for a DOM node using the specified format
 *
 * @param node - The DOM node
 * @param format - The desired XPath format
 * @returns The XPath string
 */
export const generateXPathForNode = (
  node: Node, 
  format: XPathFormat = XPathFormat.ABSOLUTE
): string => {
  // For text nodes, use the parent element and add text() predicate
  if (node.nodeType === Node.TEXT_NODE && node.parentElement) {
    // Find the position of this text node among its siblings
    let position = 1;
    let sibling = node.previousSibling;
    
    while (sibling) {
      if (sibling.nodeType === Node.TEXT_NODE) {
        position++;
      }
      sibling = sibling.previousSibling;
    }
    
    // Generate XPath for the parent with text() node predicate
    const parentPath = generateXPathForNode(node.parentElement, format);
    return `${parentPath}/text()[${position}]`;
  }
  
  // For element nodes, build the path based on the requested format
  if (node.nodeType === Node.ELEMENT_NODE) {
    const element = node as Element;
    
    // ID-based format - use IDs when available for shortest path
    if (format === XPathFormat.ID_BASED) {
      const id = element.getAttribute('id');
      if (id) {
        return `//*[@id="${id}"]`;
      }
      
      // If the element itself doesn't have an ID, check for an ancestor with ID
      let parent: Element | null = element.parentElement;
      let relativePath = '';
      let foundId = false;
      
      while (parent && !foundId) {
        const parentId = parent.getAttribute('id');
        if (parentId) {
          // Build the relative path from this ancestor to our target
          let current: Element | null = element;
          const segments: string[] = [];
          
          while (current && current !== parent) {
            const tagName = current.tagName.toLowerCase();
            
            // Find position among siblings of same tag
            let position = 1;
            let sibling = current.previousElementSibling;
            while (sibling) {
              if (sibling.tagName.toLowerCase() === tagName) {
                position++;
              }
              sibling = sibling.previousElementSibling;
            }
            
            segments.unshift(`${tagName}[${position}]`);
            current = current.parentElement;
          }
          
          relativePath = segments.join('/');
          foundId = true;
          return `//*[@id="${parentId}"]/${relativePath}`;
        }
        
        parent = parent.parentElement;
      }
    }
    
    // Short format - use // for more concise paths with attributes
    if (format === XPathFormat.SHORT) {
      // Try to create a unique selector using class or other attributes
      const tagName = element.tagName.toLowerCase();
      const className = element.getAttribute('class');
      
      if (className) {
        // Use class in the XPath - this is a simplified approach
        return `//${tagName}[@class="${className}"]`;
      }
      
      // Check for other distinctive attributes
      const name = element.getAttribute('name');
      if (name) {
        return `//${tagName}[@name="${name}"]`;
      }
      
      // Try data attributes
      const dataAttrs = Array.from(element.attributes)
        .filter(attr => attr.name.startsWith('data-'));
        
      if (dataAttrs.length > 0) {
        const attr = dataAttrs[0];
        return `//${tagName}[@${attr.name}="${attr.value}"]`;
      }
      
      // If no attributes found, use a simple tag-based path with position
      // This will create shorter paths like //div[2]/h1[1] instead of absolute paths
      // Try parent-relative path (2 levels)
      if (element.parentElement) {
        const parentTag = element.parentElement.tagName.toLowerCase();
        
        // Get position among siblings
        let position = 1;
        let sibling = element.previousElementSibling;
        while (sibling) {
          if (sibling.tagName.toLowerCase() === tagName) {
            position++;
          }
          sibling = sibling.previousElementSibling;
        }
        
        // Get parent position among its siblings
        let parentPosition = 1;
        let parentSibling = element.parentElement.previousElementSibling;
        while (parentSibling) {
          if (parentSibling.tagName.toLowerCase() === parentTag) {
            parentPosition++;
          }
          parentSibling = parentSibling.previousElementSibling;
        }
        
        // Create relative path
        return `//${parentTag}[${parentPosition}]/${tagName}[${position}]`;
      }
      
      // Fallback to just the tag with position
      // Get position among siblings
      let position = 1;
      let sibling = element.previousElementSibling;
      while (sibling) {
        if (sibling.tagName.toLowerCase() === tagName) {
          position++;
        }
        sibling = sibling.previousElementSibling;
      }
      
      return `//${tagName}[${position}]`;
    }
    
    // Absolute format (default) - full path from root
    const paths: string[] = [];
    let current: Node | null = node;
    
    while (current && current.nodeType === Node.ELEMENT_NODE) {
      // Get element's position among siblings with the same tag name
      let position = 1;
      let sibling = current.previousSibling;
      
      while (sibling) {
        if (sibling.nodeType === Node.ELEMENT_NODE && 
            (sibling as Element).tagName === (current as Element).tagName) {
          position++;
        }
        sibling = sibling.previousSibling;
      }
      
      // Create the XPath segment for this element
      const currentElement = current as Element;
      const tagName = currentElement.tagName.toLowerCase();
      
      // Add this segment to the path
      paths.unshift(`${tagName}[${position}]`);
      
      // Move up to parent
      current = current.parentNode;
    }
    
    return `/${paths.join('/')}`;
  }
  
  // Default case
  return '/';
};

/**
 * Gets a human-readable display name for a DOM node
 *
 * @param node - The DOM node
 * @returns A string representing the element for display purposes
 */
export const getElementDisplayName = (node: Node): string => {
  if (node.nodeType === Node.TEXT_NODE) {
    return 'Text Node';
  }
  
  if (node.nodeType === Node.ELEMENT_NODE) {
    const element = node as Element;
    const tagName = element.tagName.toLowerCase();
    
    // Add id if available
    const id = element.getAttribute('id');
    if (id) {
      return `<${tagName} id="${id}">`;
    }
    
    // Add class if available
    const className = element.getAttribute('class');
    if (className) {
      return `<${tagName} class="${className}">`;
    }
    
    // Just the tag name
    return `<${tagName}>`;
  }
  
  return 'Unknown Node';
}; 