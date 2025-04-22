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
  isClosingTag?: boolean;
}

interface ClickRequest {
  id: number; // To handle race conditions
  content: string;
  lineNumber: number;
  column: number;
  clickedLine: string;
  approximatePosition: number;
  surroundingLines?: string;
  partialTagInfo?: {
    type: 'opening' | 'closing' | 'unknown';
    tagName?: string;
    hasOpeningBracket: boolean;
    hasClosingBracket: boolean;
  };
}

// Define DOM types for xmldom (different from browser DOM)
type XmlDomDocument = ReturnType<DOMParser['parseFromString']>;
type XmlDomElement = XmlDomDocument['documentElement'];

// Unique attribute for temporarily marking elements
const XTRACTA_ID_ATTR = 'data-xtracta-temp-id';

/**
 * Helper function to find element at a specific position in a line
 * Now handles detection of potentially incomplete tags that may span multiple lines
 */
const findElementAtPosition = (line: string, column: number, surroundingLines?: string): {
  elementMatch: ElementMatch | null;
  isPartialTag: boolean;
  partialTagInfo?: {
    type: 'opening' | 'closing' | 'unknown';
    tagName?: string;
    hasOpeningBracket: boolean;
    hasClosingBracket: boolean;
  };
} => {
  // First, check if this is a complete closing tag
  const closingTagRegex = /<\/([a-zA-Z0-9_:-]+)>/g;
  let match;
  
  while ((match = closingTagRegex.exec(line)) !== null) {
    const startIndex = match.index;
    const endIndex = startIndex + match[0].length;
    
    if (column >= startIndex && column <= endIndex) {
      const tagName = match[1];
      return { 
        elementMatch: { 
          tagName, 
          attributes: {}, 
          startIndex, 
          endIndex, 
          isClosingTag: true 
        },
        isPartialTag: false
      };
    }
  }
  
  // Check for complete opening tags
  const tagRegex = /<([a-zA-Z0-9_:-]+)([^>]*?)(\/?)>/g;
  
  while ((match = tagRegex.exec(line)) !== null) {
    const startIndex = match.index;
    const endIndex = startIndex + match[0].length;
    
    if (column >= startIndex && column <= endIndex) {
      const tagName = match[1];
      const attributesStr = match[2].trim();
      const attributes: Record<string, string> = {};
      
      // Parse attributes
      const attrRegex = /([a-zA-Z0-9_:-]+)(?:=(?:"([^"]*)"|'([^']*)'|([^\s>]*))?)?/g;
      let attrMatch;
      
      while ((attrMatch = attrRegex.exec(attributesStr)) !== null) {
        if (attrMatch[1]) { // Attribute name exists
          const value = attrMatch[2] || attrMatch[3] || attrMatch[4] || '';
          attributes[attrMatch[1]] = value;
        }
      }
      
      return { 
        elementMatch: { tagName, attributes, startIndex, endIndex },
        isPartialTag: false
      };
    }
  }
  
  // If we're here, we didn't find a complete tag at the click position
  // Check if we might be inside a multi-line tag
  
  // Check if there's an opening bracket before the click position
  const openingBracketPos = line.lastIndexOf('<', column);
  const closingBracketPos = line.indexOf('>', column);
  
  // If opening bracket exists but no closing bracket after cursor, or opening bracket is after cursor
  // but before a closing bracket, we might be in a multi-line tag
  if (openingBracketPos !== -1 && (closingBracketPos === -1 || openingBracketPos > closingBracketPos)) {
    // Extract what we have of the tag so far
    const partialTag = line.substring(openingBracketPos);
    
    // Check if it's an opening or closing tag
    const isClosingTag = partialTag.startsWith('</');
    
    // Try to extract the tag name if possible
    let tagName: string | undefined;
    const tagNameMatch = partialTag.match(isClosingTag ? /^<\/([a-zA-Z0-9_:-]+)/ : /^<([a-zA-Z0-9_:-]+)/);
    if (tagNameMatch) {
      tagName = tagNameMatch[1];
    }
    
    return {
      elementMatch: null,
      isPartialTag: true,
      partialTagInfo: {
        type: isClosingTag ? 'closing' : 'opening',
        tagName,
        hasOpeningBracket: true,
        hasClosingBracket: false
      }
    };
  }
  
  // Check if there's a closing bracket after the click position but no opening bracket before it
  if (closingBracketPos !== -1 && (openingBracketPos === -1 || openingBracketPos > closingBracketPos)) {
    // We're in a tag that started on a previous line
    return {
      elementMatch: null,
      isPartialTag: true,
      partialTagInfo: {
        type: 'unknown' as 'opening' | 'closing' | 'unknown',
        hasOpeningBracket: false,
        hasClosingBracket: true
      }
    };
  }
  
  // Check if we're in the middle of a tag without any brackets on this line
  // This might be the case if we're on a line that only contains attributes
  if (surroundingLines && 
      openingBracketPos === -1 && 
      closingBracketPos === -1 && 
      /^\s*[a-zA-Z0-9_:-]+=("[^"]*"|'[^']*'|[^\s>]*)/.test(line.trimLeft())) {
    return {
      elementMatch: null,
      isPartialTag: true,
      partialTagInfo: {
        type: 'unknown' as 'opening' | 'closing' | 'unknown',
        hasOpeningBracket: false,
        hasClosingBracket: false
      }
    };
  }
  
  // If we have an opening bracket but no closing bracket, it's a partial opening tag
  if (openingBracketPos !== -1 && closingBracketPos === -1) {
    const tagNameMatch = line.substring(openingBracketPos + 1).match(/^([a-zA-Z0-9_:-]+)/);
    return {
      elementMatch: null,
      isPartialTag: true,
      partialTagInfo: {
        type: 'opening',
        tagName: tagNameMatch ? tagNameMatch[1] : undefined,
        hasOpeningBracket: true,
        hasClosingBracket: false
      }
    };
  }
  
  // If none of the above, we're not in a tag
  return { elementMatch: null, isPartialTag: false };
};

/**
 * Find and extract a complete tag from multiple lines of code
 * Used when a tag spans multiple lines and the user clicks on part of it
 */
const extractCompleteTagFromMultilineContext = (
  lines: string[],
  lineIndex: number,
  columnIndex: number,
  partialInfo: {
    type: 'opening' | 'closing' | 'unknown';
    tagName?: string;
    hasOpeningBracket: boolean;
    hasClosingBracket: boolean;
  }
): string | null => {
  // Get the clicked line
  const clickedLine = lines[lineIndex - 1];
  
  // Find opening bracket position in the current line or preceding lines
  let openingBracketLine = lineIndex - 1;
  let openingBracketPos = clickedLine.lastIndexOf('<', columnIndex);
  
  // If no opening bracket in the current line, search backwards
  while (openingBracketPos === -1 && openingBracketLine > 0) {
    openingBracketLine--;
    openingBracketPos = lines[openingBracketLine].lastIndexOf('<');
  }
  
  // Find closing bracket position in current line or following lines
  let closingBracketLine = lineIndex - 1;
  let closingBracketPos = clickedLine.indexOf('>', columnIndex);
  
  // If no closing bracket in the current line, search forwards
  while (closingBracketPos === -1 && closingBracketLine < lines.length - 1) {
    closingBracketLine++;
    closingBracketPos = lines[closingBracketLine].indexOf('>');
  }
  
  // If we can't find both brackets, return null
  if (openingBracketPos === -1 || closingBracketPos === -1) {
    return null;
  }
  
  // Extract the complete tag
  let completeTag = '';
  
  // Add the part from the opening bracket line
  completeTag += lines[openingBracketLine].substring(openingBracketPos);
  
  // Add all lines in between
  for (let i = openingBracketLine + 1; i < closingBracketLine; i++) {
    completeTag += ' ' + lines[i];
  }
  
  // Add the part from the closing bracket line up to and including the closing bracket
  if (closingBracketLine > openingBracketLine) {
    completeTag += ' ' + lines[closingBracketLine].substring(0, closingBracketPos + 1);
  }
  
  // Normalize whitespace in the complete tag
  completeTag = completeTag.replace(/\s+/g, ' ');
  
  // Check if it's a closing tag
  const isClosingTag = completeTag.startsWith('</');
  
  // Parse the tag
  const tagMatch = isClosingTag 
    ? completeTag.match(/<\/([a-zA-Z0-9_:-]+)>/) 
    : completeTag.match(/<([a-zA-Z0-9_:-]+)([^>]*?)(?:\s*\/)?>/);
  
  if (!tagMatch) {
    return null;
  }
  
  if (isClosingTag) {
    return tagMatch[1];
  } else {
    const tagName = tagMatch[1];
    const attributesStr = tagMatch[2] ? tagMatch[2].trim() : '';
    const attributes: Record<string, string> = {};
    
    // Parse attributes
    const attrRegex = /([a-zA-Z0-9_:-]+)(?:=(?:"([^"]*)"|'([^']*)'|([^\s>]*))?)?/g;
    let attrMatch;
    
    while ((attrMatch = attrRegex.exec(attributesStr)) !== null) {
      if (attrMatch[1]) {
        const value = attrMatch[2] || attrMatch[3] || attrMatch[4] || '';
        attributes[attrMatch[1]] = value;
      }
    }
    
    return null;
  }
};

/**
 * Modify the HTML content to add a unique identifier to the target element
 */
const addIdentifierToElement = (
  content: string, 
  elementMatch: ElementMatch, 
  lineNumber: number, 
  approximatePosition: number
): { modifiedContent: string; uniqueId: string } => {
  // Generate a unique ID
  const uniqueId = `xtracta-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
  
  // Split content into lines
  const lines = content.split('\n');
  
  // Handle closing tag case
  if (elementMatch.isClosingTag) {
    // Find the matching opening tag
    const { openingTag, openingTagLineNumber } = findMatchingOpeningTag(
      content,
      elementMatch.tagName,
      approximatePosition
    );
    
    if (openingTag) {
      // Process the opening tag line instead
      const line = lines[openingTagLineNumber - 1];
      const beforeTag = line.substring(0, openingTag.startIndex);
      const tag = line.substring(openingTag.startIndex, openingTag.endIndex);
      const afterTag = line.substring(openingTag.endIndex);
      
      // Check if it's a self-closing tag
      const isSelfClosing = tag.endsWith('/>');
      
      // Insert attribute before the closing bracket
      let modifiedTag;
      if (isSelfClosing) {
        modifiedTag = tag.replace(/(\s*\/?>)$/, ` ${XTRACTA_ID_ATTR}="${uniqueId}"$1`);
      } else {
        modifiedTag = tag.replace(/>$/, ` ${XTRACTA_ID_ATTR}="${uniqueId}">`);
      }
      
      // Reassemble the line
      const modifiedLine = beforeTag + modifiedTag + afterTag;
      lines[openingTagLineNumber - 1] = modifiedLine;
      
      // Join lines back to content
      return { modifiedContent: lines.join('\n'), uniqueId };
    } else {
      // If we couldn't find the opening tag, return original content
      return { modifiedContent: content, uniqueId };
    }
  }
  
  // Handle normal opening tag case
  const line = lines[lineNumber - 1];
  
  // For opening tag, insert the attribute before the closing >
  if (elementMatch.startIndex >= 0 && elementMatch.endIndex > 0) {
    const beforeTag = line.substring(0, elementMatch.startIndex);
    const tag = line.substring(elementMatch.startIndex, elementMatch.endIndex);
    const afterTag = line.substring(elementMatch.endIndex);
    
    // Check if it's a self-closing tag
    const isSelfClosing = tag.endsWith('/>');
    
    // Insert attribute before the closing bracket
    let modifiedTag;
    if (isSelfClosing) {
      // For self-closing tags: <tag attr /> -> <tag attr data-xtracta-temp-id="uniqueId" />
      modifiedTag = tag.replace(/(\s*\/?>)$/, ` ${XTRACTA_ID_ATTR}="${uniqueId}"$1`);
    } else {
      // For normal tags: <tag attr> -> <tag attr data-xtracta-temp-id="uniqueId">
      modifiedTag = tag.replace(/>$/, ` ${XTRACTA_ID_ATTR}="${uniqueId}">`);
    }
    
    // Reassemble the line
    const modifiedLine = beforeTag + modifiedTag + afterTag;
    lines[lineNumber - 1] = modifiedLine;
    
    // Join lines back to content
    return { modifiedContent: lines.join('\n'), uniqueId };
  }
  
  // If we couldn't add the attribute properly, return the original content and a fallback ID
  return { modifiedContent: content, uniqueId };
};

/**
 * Generate XPath for an element with the given temporary ID
 */
const generateXPathById = (doc: XmlDomDocument, uniqueId: string): string | null => {
  // Find the element with our temporary ID
  const elements = Array.from(doc.getElementsByTagName('*'));
  const targetElement = elements.find(el => el.getAttribute(XTRACTA_ID_ATTR) === uniqueId);
  
  if (!targetElement) {
    return null;
  }
  
  return generateXPath(targetElement);
};

/**
 * Helper function to generate XPath using the simplified approach
 */
const generateXPath = (element: XmlDomElement): string => {
  if (!element) {
    return '';
  }
  
  // If the element itself has an ID (but not our temporary ID), just use that (most specific)
  const id = element.getAttribute('id');
  if (id && element.getAttribute(XTRACTA_ID_ATTR) === null) {
    return `//*[@id="${id}"]`;
  }
  
  // Check for parent elements with ID to create a relative path
  let current: XmlDomElement | null = element;
  let idFound = false;
  
  while (current && !idFound) {
    const parent: XmlDomElement | null = current.parentElement as XmlDomElement | null;
    
    if (!parent) break;
    
    const parentId = parent.getAttribute('id');
    // Only use real IDs, not our temporary marker
    if (parentId && parent.getAttribute(XTRACTA_ID_ATTR) === null) {
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
            const childElement = child as XmlDomElement;
            if (!childElement || !childElement.tagName) return false;
            return childElement.tagName.toLowerCase() === tagName;
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
        const childElement = child as XmlDomElement;
        if (!childElement || !childElement.tagName) return false;
        return childElement.tagName.toLowerCase() === tagName;
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
    // Split content into lines for processing multi-line tags
    const lines = request.content.split('\n');
    
    // First check if we have a regular element or need to handle a multi-line tag
    const { elementMatch, isPartialTag } = findElementAtPosition(
      request.clickedLine, 
      request.column, 
      request.surroundingLines
    );
    
    // If we got a complete tag element match, proceed as normal
    if (elementMatch) {
      // Add a unique identifier to the element in the content
      const { modifiedContent, uniqueId } = addIdentifierToElement(
        request.content,
        elementMatch,
        request.lineNumber,
        request.approximatePosition
      );
      
      // Parse the modified content
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(modifiedContent, 'text/html');
      
      // Generate XPath using our unique identifier
      const xpath = generateXPathById(xmlDoc, uniqueId);
      
      if (xpath) {
        return { id: request.id, xpath };
      }
      
      // If the approach failed, use fallback
      return handleFallbackXPathGeneration(
        request, 
        elementMatch, 
        request.lineNumber
      );
    } 
    
    // Handle multi-line tag
    if (isPartialTag) {
      // Extract the complete tag from surrounding lines
      const completeTag = extractCompleteTagFromMultilineContext(
        lines,
        request.lineNumber,
        request.column,
        request.partialTagInfo ?? {
          type: 'unknown',
          hasOpeningBracket: false,
          hasClosingBracket: false
        }
      );
      
      if (completeTag) {
        // Add a unique identifier to the element in the content
        const { modifiedContent, uniqueId } = addIdentifierToElement(
          request.content,
          {
            tagName: completeTag,
            attributes: {},
            startIndex: 0,
            endIndex: 0,
            isClosingTag: false
          },
          request.lineNumber,
          request.approximatePosition
        );
        
        // Parse the modified content
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(modifiedContent, 'text/html');
        
        // Generate XPath using our unique identifier
        const xpath = generateXPathById(xmlDoc, uniqueId);
        
        if (xpath) {
          return { id: request.id, xpath };
        }
        
        // If the approach failed, use fallback
        return handleFallbackXPathGeneration(
          request, 
          {
            tagName: completeTag,
            attributes: {},
            startIndex: 0,
            endIndex: 0,
            isClosingTag: false
          },
          request.lineNumber
        );
      }
    }
    
    // If we couldn't find any tag at the clicked position
    return { 
      id: request.id, 
      xpath: null, 
      error: 'No element found at the clicked position' 
    };
  } catch (error: any) {
    return { 
      id: request.id, 
      xpath: null, 
      error: error.message || 'Unknown error generating XPath' 
    };
  }
};

/**
 * Fallback XPath generation when unique ID approach fails
 */
const handleFallbackXPathGeneration = (
  request: ClickRequest,
  elementMatch: ElementMatch,
  lineNumber: number
): { id: number; xpath: string | null; error?: string } => {
  try {
    // Create a temporary DOM parser for the original content
    const parser = new DOMParser();
    const originalDoc = parser.parseFromString(request.content, 'text/html');
    
    // If this was a closing tag, we need to find the opening tag first
    if (elementMatch.isClosingTag) {
      const { openingTag } = findMatchingOpeningTag(
        request.content,
        elementMatch.tagName,
        request.approximatePosition
      );
      
      if (openingTag) {
        // Use the opening tag for the search
        const elementInDoc = findElementInDocument(
          originalDoc,
          openingTag.tagName,
          openingTag.attributes,
          request.content,
          request.approximatePosition
        );
        
        if (elementInDoc) {
          const fallbackXPath = generateXPath(elementInDoc);
          return { id: request.id, xpath: fallbackXPath };
        }
      }
    } else {
      // Find the element based on its position and attributes
      const { tagName, attributes } = elementMatch;
      const elementInDoc = findElementInDocument(
        originalDoc, 
        tagName, 
        attributes, 
        request.content, 
        request.approximatePosition
      );
      
      if (elementInDoc) {
        const fallbackXPath = generateXPath(elementInDoc);
        return { id: request.id, xpath: fallbackXPath };
      }
    }
    
    return { 
      id: request.id, 
      xpath: null, 
      error: 'Could not generate XPath for the selected element' 
    };
  } catch (error: any) {
    return { 
      id: request.id, 
      xpath: null, 
      error: error.message || 'Error in fallback XPath generation' 
    };
  }
};

/**
 * Helper function to find element in parsed DOM that matches the clicked location in source
 * Only used as a fallback when the temporary ID approach fails
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
  
  // Get all elements of this tag type
  const elements = Array.from(doc.getElementsByTagName(tagName));
  
  if (elements.length === 0) {
    return null;
  }
  
  // If there's only one element of this type, use it
  if (elements.length === 1) {
    return elements[0];
  }
  
  // Try to match by attributes
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
  
  // Just return the first matching element as a fallback
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
 * Find the corresponding opening tag in the document for a closing tag
 * This is used when a user clicks on a closing tag like </div>
 */
const findMatchingOpeningTag = (
  content: string,
  closingTagName: string,
  approximatePosition: number
): { 
  openingTag: ElementMatch | null; 
  openingTagLineNumber: number;
} => {
  // Split content into lines for processing
  const lines = content.split('\n');
  
  // Find which line contains the approximate position
  let currentPosition = 0;
  let currentLine = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const lineLength = lines[i].length + 1; // +1 for newline
    currentPosition += lineLength;
    
    if (currentPosition >= approximatePosition) {
      currentLine = i;
      break;
    }
  }
  
  // Work backwards from current position to find matching opening tag
  let openBracketCount = 0;
  
  // Create a simple stack to track tags
  const tagStack: string[] = [];
  
  // Search backwards from current line
  for (let lineNum = currentLine; lineNum >= 0; lineNum--) {
    const line = lines[lineNum];
    
    // Find all tags in the line
    const allTagsRegex = /<\/?([a-zA-Z0-9_:-]+)[^>]*>/g;
    const tags: {
      tagName: string;
      isClosing: boolean;
      position: number;
    }[] = [];
    
    let tagMatch;
    while ((tagMatch = allTagsRegex.exec(line)) !== null) {
      const isClosing = tagMatch[0].startsWith('</');
      tags.push({
        tagName: tagMatch[1],
        isClosing,
        position: tagMatch.index
      });
    }
    
    // Process tags in reverse order (right to left) for this line
    for (let i = tags.length - 1; i >= 0; i--) {
      const { tagName, isClosing, position } = tags[i];
      
      if (isClosing) {
        // Push onto stack when we find a closing tag
        tagStack.push(tagName);
      } else {
        // Check if this opening tag matches what we're looking for
        if (tagStack.length > 0 && tagStack[tagStack.length - 1] === tagName) {
          // Pop the stack when we find a matching opening tag
          tagStack.pop();
        } else if (tagName === closingTagName && tagStack.length === 0) {
          // This is our matching opening tag!
          
          // Extract attributes for this opening tag
          const tagStart = position;
          const tagText = line.substring(tagStart);
          const tagEndMatch = /^<[^>]+>/.exec(tagText);
          
          if (tagEndMatch) {
            const fullTag = tagEndMatch[0];
            const attributesMatch = fullTag.match(/<[^ >]+(.*)>/);
            const attributesStr = attributesMatch ? attributesMatch[1].trim() : '';
            
            const attributes: Record<string, string> = {};
            const attrRegex = /([a-zA-Z0-9_:-]+)(?:=(?:"([^"]*)"|'([^']*)'|([^\s>]*))?)?/g;
            let attrMatch;
            
            while ((attrMatch = attrRegex.exec(attributesStr)) !== null) {
              if (attrMatch[1]) {
                const value = attrMatch[2] || attrMatch[3] || attrMatch[4] || '';
                attributes[attrMatch[1]] = value;
              }
            }
            
            return {
              openingTag: {
                tagName,
                attributes,
                startIndex: position,
                endIndex: position + fullTag.length
              },
              openingTagLineNumber: lineNum + 1 // +1 because line numbers are 1-based
            };
          }
        }
      }
    }
  }
  
  // If no matching opening tag is found
  return { openingTag: null, openingTagLineNumber: 0 };
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