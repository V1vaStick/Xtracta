import { useEffect, useState } from 'react';
import { editor } from 'monaco-editor';
import { useEditorStore } from '../../store/editorStore';

/**
 * Helper function to find element at a specific position in a line
 */
const findElementAtPosition = (line: string, column: number): { tagName: string; attributes: Record<string, string> } | null => {
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
      
      console.log('Found element at position:', { tagName, attributes, start: startIndex, end: endIndex });
      return { tagName, attributes };
    }
  }
  
  // If no opening tag is found, try to find a closing tag
  const closingTagRegex = /<\/([a-zA-Z0-9_:-]+)>/g;
  while ((match = closingTagRegex.exec(line)) !== null) {
    const startIndex = match.index;
    const endIndex = startIndex + match[0].length;
    
    if (column >= startIndex && column <= endIndex) {
      const tagName = match[1];
      console.log('Found closing tag:', { tagName, start: startIndex, end: endIndex });
      return { tagName, attributes: {} };
    }
  }
  
  console.log('No element found at position', column, 'in line:', line);
  return null;
};

/**
 * Helper function to find element in parsed DOM
 */
const findElementInDocument = (doc: Document, tagName: string, attributes: Record<string, string>): Element | null => {
  console.log('Finding element in document:', { tagName, attributes });
  
  // First try to find by ID if available
  if (attributes.id) {
    const elementById = doc.getElementById(attributes.id);
    if (elementById) {
      console.log('Found element by ID:', attributes.id, elementById);
      return elementById;
    }
  }
  
  // Try data-x-bind if available as it's often unique
  if (attributes['data-x-bind']) {
    const selector = `[data-x-bind="${attributes['data-x-bind']}"]`;
    const elementByDataBind = doc.querySelector(selector);
    if (elementByDataBind) {
      console.log('Found element by data-x-bind:', selector, elementByDataBind);
      return elementByDataBind;
    }
  }
  
  // Get all elements of this tag type
  const elements = doc.getElementsByTagName(tagName);
  console.log(`Found ${elements.length} potential ${tagName} elements`);
  
  // First try exact attribute matching
  for (let i = 0; i < elements.length; i++) {
    const element = elements[i];
    let match = true;
    
    // Check if all attributes match
    for (const [key, value] of Object.entries(attributes)) {
      if (element.getAttribute(key) !== value) {
        match = false;
        break;
      }
    }
    
    if (match) {
      console.log('Found exact matching element:', element);
      return element;
    }
  }
  
  // If no exact match, try partial attribute matching as a fallback
  // This helps with attributes that have dynamic parts like data-x-bind="ChapterItem(index)"
  for (let i = 0; i < elements.length; i++) {
    const element = elements[i];
    let matchCount = 0;
    let totalAttributes = 0;
    
    for (const [key, value] of Object.entries(attributes)) {
      totalAttributes++;
      const attrValue = element.getAttribute(key);
      
      // For data-x-bind attributes, check if the base function name matches
      if (key === 'data-x-bind' && attrValue && value) {
        // Extract function name before parentheses
        const funcNamePattern = /^([^\(]+)/;
        const expectedMatch = value.match(funcNamePattern);
        const actualMatch = attrValue.match(funcNamePattern);
        
        if (expectedMatch && actualMatch && expectedMatch[1] === actualMatch[1]) {
          matchCount++;
          continue;
        }
      }
      
      // For other attributes, direct match or contained match
      if (attrValue === value || (attrValue && value && attrValue.includes(value))) {
        matchCount++;
      }
    }
    
    // If most attributes match, use this element
    if (totalAttributes > 0 && matchCount > 0 && (matchCount / totalAttributes) > 0.5) {
      console.log('Found partial matching element:', element, 
        `(matched ${matchCount}/${totalAttributes} attributes)`);
      return element;
    }
  }
  
  console.log('No matching element found in document');
  return null;
};

/**
 * Helper function to generate XPath using the simplified approach
 */
const generateXPath = (element: Element): string => {
  // If the element itself has an ID, just use that (most specific)
  if (element.id) {
    return `//*[@id="${element.id}"]`;
  }

  // Build parts of the path as we traverse up
  const parts: string[] = [];
  let current: Element | null = element;
  
  // Start with the current element
  while (current) {
    // Get the element's tag name
    const tagName = current.tagName.toLowerCase();
    
    // If we find an element with ID, we can create a relative path from here
    if (current.id && current !== element) {
      // We found an ancestor with ID, so build relative path from here
      return `//*[@id="${current.id}"]${parts.join('')}`;
    }
    
    // Save parent before using it to avoid the linter error
    const parent: Element | null = current.parentElement;
    
    if (parent) {
      // Find position among siblings if there are multiple elements with same tag
      const siblings = Array.from(parent.children).filter(
        (child): child is Element => 
          child instanceof Element && child.tagName.toLowerCase() === tagName
      );
      
      if (siblings.length > 1) {
        // Need position index
        const position = siblings.indexOf(current) + 1;
        parts.unshift(`/${tagName}[${position}]`);
      } else {
        parts.unshift(`/${tagName}`);
      }
    } else {
      // Root element
      parts.unshift(`/${tagName}`);
    }
    
    // Move up to parent
    current = parent;
  }
  
  // Return the absolute path
  return parts.join('');
};

const ClickToXPathProvider = ({ 
  editorInstance 
}: { 
  editorInstance: editor.IStandaloneCodeEditor | null 
}) => {
  const { content, setXPath } = useEditorStore();
  const [isCtrlOrCmdPressed, setIsCtrlOrCmdPressed] = useState(false);

  // Setup keyboard event listeners for Ctrl/Cmd key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        setIsCtrlOrCmdPressed(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Control' || e.key === 'Meta') {
        setIsCtrlOrCmdPressed(false);
      }
    };

    // Add event listeners for key detection
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // Clean up event listeners
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Setup click handler when editor instance changes
  useEffect(() => {
    if (!editorInstance || !content) return;

    // Register click handler
    const clickDisposable = editorInstance.onMouseDown((e) => {
      // Only process clicks when Ctrl/Cmd is pressed
      if (e.target.position && isCtrlOrCmdPressed && e.event.leftButton) {
        e.event.preventDefault(); // Prevent default editor click behavior
        
        const { lineNumber, column } = e.target.position;
        
        try {
          // Create a temporary DOM parser to handle the XML content
          const parser = new DOMParser();
          const xmlDoc = parser.parseFromString(content, 'text/html');
          
          // Get the clicked line from the editor
          const model = editorInstance.getModel();
          if (!model) return;
          
          // Get the clicked line and surrounding lines to handle multi-line tags
          const clickedLine = model.getLineContent(lineNumber);
          console.log('Clicked line:', clickedLine);
          
          // Try normal element detection first
          let elementMatch = findElementAtPosition(clickedLine, column);
          
          // If normal detection fails, try to handle multi-line tags
          if (!elementMatch && clickedLine.includes('<') && !clickedLine.includes('>')) {
            console.log('Attempting to handle multi-line tag...');
            
            // Get several lines around the current line to capture the entire tag
            const startLine = Math.max(1, lineNumber - 2);
            const endLine = Math.min(model.getLineCount(), lineNumber + 3);
            let combinedLines = '';
            
            for (let i = startLine; i <= endLine; i++) {
              combinedLines += model.getLineContent(i) + ' ';
            }
            
            console.log('Combined lines for multi-line tag detection:', combinedLines);
            
            // Try to find partial tag match in the clicked line
            const tagStartMatch = /<([a-zA-Z0-9_:-]+)([^>]*?)$/g.exec(clickedLine);
            if (tagStartMatch) {
              const tagName = tagStartMatch[1];
              const partialAttrs = tagStartMatch[2];
              
              console.log('Found partial tag:', { tagName, partialAttrs });
              
              // Try to find complete tag in combined lines
              const fullTagRegex = new RegExp(`<${tagName}[^>]*?>`, 'g');
              const fullTagMatch = fullTagRegex.exec(combinedLines);
              
              if (fullTagMatch) {
                console.log('Found complete tag in surrounding lines:', fullTagMatch[0]);
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
                elementMatch = { tagName, attributes };
              }
            }
          }
          
          if (elementMatch) {
            const { tagName, attributes } = elementMatch;
            
            // Try to find the element in the parsed DOM
            const elementInDoc = findElementInDocument(xmlDoc, tagName, attributes);
            
            if (elementInDoc) {
              // Generate XPath with simplified approach
              const xpath = generateXPath(elementInDoc);
              setXPath(xpath);
              console.log('Generated XPath:', xpath);
            } else {
              console.warn('No element found in document for clicked position');
            }
          } else {
            console.warn('No element found at the clicked position');
          }
        } catch (error) {
          console.error('Error generating XPath for click position:', error);
        }
      }
    });

    return () => {
      clickDisposable.dispose();
    };
  }, [editorInstance, content, isCtrlOrCmdPressed, setXPath]);

  // Add a cursor style to indicate XPath selection mode is active
  useEffect(() => {
    if (!editorInstance) return;
    
    const editorElement = editorInstance.getDomNode();
    if (!editorElement) return;
    
    if (isCtrlOrCmdPressed) {
      editorElement.style.cursor = 'pointer';
    } else {
      editorElement.style.cursor = 'text';
    }
    
    return () => {
      editorElement.style.cursor = 'text';
    };
  }, [editorInstance, isCtrlOrCmdPressed]);

  return null;
};

export default ClickToXPathProvider; 