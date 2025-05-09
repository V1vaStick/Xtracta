import { useEffect, useState, useRef } from 'react';
import { editor } from 'monaco-editor';
import { useEditorStore } from '../../store/editorStore';

/**
 * Helper function to find element at a specific position in a line
 */
const findElementAtPosition = (line: string, column: number): { tagName: string; attributes: Record<string, string>; startIndex: number; endIndex: number } | null => {
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
      console.log('Found closing tag:', { tagName, start: startIndex, end: endIndex });
      return { tagName, attributes: {}, startIndex, endIndex };
    }
  }
  
  console.log('No element found at position', column, 'in line:', line);
  return null;
};

/**
 * Helper function to calculate the approximate position of an element in the original source
 */
const calculateElementPosition = (model: editor.ITextModel, lineNumber: number, column: number): number => {
  let position = 0;
  
  // Add up lengths of all previous lines
  for (let i = 1; i < lineNumber; i++) {
    position += model.getLineContent(i).length + 1; // +1 for newline
  }
  
  // Add column position in current line
  position += column;
  
  return position;
};

/**
 * Helper function to find element in parsed DOM that matches the clicked location in source
 */
const findElementInDocument = (
  doc: Document, 
  tagName: string, 
  attributes: Record<string, string>,
  sourceContent: string,
  approximateSourcePosition: number
): Element | null => {
  console.log('Finding element in document:', { tagName, attributes, approximateSourcePosition });
  
  // First try to find by ID if available
  if (attributes.id) {
    const elementById = doc.getElementById(attributes.id);
    if (elementById && elementById.tagName.toLowerCase() === tagName.toLowerCase()) {
      console.log('Found element by ID:', attributes.id, elementById);
      return elementById;
    }
  }
  
  // Extract section of source content around click position for context matching
  const contextStart = Math.max(0, approximateSourcePosition - 500);
  const contextEnd = Math.min(sourceContent.length, approximateSourcePosition + 500);
  const contextWindow = sourceContent.substring(contextStart, contextEnd).toLowerCase();
  
  // Get all elements of this tag type
  const elements = Array.from(doc.getElementsByTagName(tagName));
  console.log(`Found ${elements.length} potential ${tagName} elements`);
  
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
    console.log('Found unique element by attributes:', matchingElements[0]);
    return matchingElements[0];
  }
  
  // Score each element based on multiple criteria
  type ScoredElement = { element: Element; score: number };
  const scoredElements: ScoredElement[] = [];
  
  // Use the selection of elements we've filtered down to, or all of them if we have no filtered set
  const candidateElements = matchingElements.length > 0 ? matchingElements : elements;
  
  for (const element of candidateElements) {
    let score = 0;
    
    // 1. Build the ancestral path to help with identification
    const ancestorPath: string[] = [];
    let current: Element | null = element;
    
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
      
      current = current.parentElement;
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
    const elementOuterHtml = element.outerHTML.toLowerCase();
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
    if (nearestParentWithId && nearestParentWithId.id === 'content') {
      score += 25; // Strongly prefer elements in the content area
    } else if (nearestParentWithId && nearestParentWithId.id === 'root') {
      score += 5; // Root is less specific but still useful
    }
    
    // Content areas with links are more likely to be the sidebar
    if (isInSidebar && fullPath.includes('li') && fullPath.includes('a')) {
      score += 10;
    }
    
    scoredElements.push({ element, score });
  }
  
  // Sort by score descending and get the best match
  scoredElements.sort((a, b) => b.score - a.score);
  
  if (scoredElements.length > 0) {
    console.log('Element scores:', scoredElements.map(e => ({ 
      element: e.element.tagName, 
      score: e.score, 
      path: getElementPath(e.element)
    })));
    
    const bestMatch = scoredElements[0].element;
    console.log('Best matching element:', bestMatch, 'with score:', scoredElements[0].score);
    return bestMatch;
  }
  
  // Fallback
  console.log('No good match found, using fallback');
  return matchingElements[0] || elements[0];
};

/**
 * Helper function to find the nearest parent with an ID attribute
 */
const findNearestParentWithId = (element: Element): Element | null => {
  let current: Element | null = element;
  
  while (current) {
    if (current.id) {
      return current;
    }
    current = current.parentElement;
  }
  
  return null;
};

/**
 * Helper function to get a simple path string for an element (for debugging)
 */
const getElementPath = (element: Element): string => {
  const parts: string[] = [];
  let current: Element | null = element;
  
  while (current) {
    const tag = current.tagName.toLowerCase();
    const id = current.id ? `#${current.id}` : '';
    parts.unshift(id ? `${tag}${id}` : tag);
    current = current.parentElement;
  }
  
  return parts.join('/');
};

/**
 * Helper function to generate XPath using the simplified approach
 */
const generateXPath = (element: Element): string => {
  // If the element itself has an ID, just use that (most specific)
  if (element.id) {
    return `//*[@id="${element.id}"]`;
  }
  
  // Check for parent elements with ID to create a relative path
  let current: Element | null = element;
  let idFound = false;
  
  while (current && !idFound) {
    const parent: Element | null = current.parentElement;
    
    if (!parent) break;
    
    if (parent.id) {
      // Found a parent with ID, build path from here
      idFound = true;
      
      // Calculate the path from this ID to our target element
      const pathParts: string[] = [];
      let pathCurrent: Element | null = element;
      
      while (pathCurrent && pathCurrent !== parent) {
        const tagName = pathCurrent.tagName.toLowerCase();
        const parentElement = pathCurrent.parentElement;
        
        if (!parentElement) break;
        
        const siblings = Array.from(parentElement.children)
          .filter(child => 
            child instanceof Element && 
            child.tagName.toLowerCase() === tagName
          );
        
        if (siblings.length > 1) {
          // Need position index for disambiguation
          const position = siblings.indexOf(pathCurrent) + 1;
          pathParts.unshift(`/${tagName}[${position}]`);
        } else {
          pathParts.unshift(`/${tagName}`);
        }
        
        pathCurrent = pathCurrent.parentElement;
      }
      
      return `//*[@id="${parent.id}"]${pathParts.join('')}`;
    }
    
    current = parent;
  }
  
  // If no ID found, build absolute path
  const parts: string[] = [];
  current = element;
  
  while (current) {
    const tagName = current.tagName.toLowerCase();
    const parent: Element | null = current.parentElement;
    
    if (parent) {
      // Check if we need position index
      const siblings = Array.from(parent.children).filter(
        child => child instanceof Element && child.tagName.toLowerCase() === tagName
      );
      
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

const ClickToXPathProvider = ({ 
  editorInstance 
}: { 
  editorInstance: editor.IStandaloneCodeEditor | null 
}) => {
  const { content, setXPath, setXPathClickProcessing } = useEditorStore();
  const [isCtrlOrCmdPressed, setIsCtrlOrCmdPressed] = useState(false);
  const [worker, setWorker] = useState<Worker | null>(null);
  const latestClickIdRef = useRef(0);

  // Initialize worker on component mount
  useEffect(() => {
    // Create worker
    const xpathWorker = new Worker(
      new URL('../../workers/click-to-xpath-worker.ts', import.meta.url),
      { type: 'module' }
    );

    // Set up message handler
    xpathWorker.onmessage = (event) => {
      const { id, xpath, error } = event.data;
      
      // Only process this result if it's from the latest click (handles race condition)
      if (id === latestClickIdRef.current) {
        if (xpath) {
          setXPath(xpath);
        } else if (error) {
          console.warn('Error generating XPath:', error);
        }
        
        // End loading state when processing is complete
        setXPathClickProcessing(false);
      }
    };

    setWorker(xpathWorker);

    // Clean up worker on component unmount
    return () => {
      xpathWorker.terminate();
    };
  }, [setXPath, setXPathClickProcessing]);

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
    if (!editorInstance || !content || !worker) return;

    // Register click handler
    const clickDisposable = editorInstance.onMouseDown((e) => {
      // Only process clicks when Ctrl/Cmd is pressed
      if (e.target.position && isCtrlOrCmdPressed && e.event.leftButton) {
        e.event.preventDefault(); // Prevent default editor click behavior
        
        const { lineNumber, column } = e.target.position;
        
        try {
          // Set loading state to true when starting the process
          setXPathClickProcessing(true);
          
          // Get the model and clicked line
          const model = editorInstance.getModel();
          if (!model) {
            setXPathClickProcessing(false);
            return;
          }
          
          // Get the clicked line and calculate approximate position
          const clickedLine = model.getLineContent(lineNumber);
          const approximatePosition = calculateElementPosition(model, lineNumber, column);
          
          // For multi-line tag support, get surrounding lines
          const startLine = Math.max(1, lineNumber - 2);
          const endLine = Math.min(model.getLineCount(), lineNumber + 3);
          let surroundingLines = '';
          
          for (let i = startLine; i <= endLine; i++) {
            surroundingLines += model.getLineContent(i) + ' ';
          }
          
          // Increment click ID to track the latest click
          latestClickIdRef.current++;
          
          // Send request to worker
          worker.postMessage({
            id: latestClickIdRef.current,
            content,
            lineNumber,
            column,
            clickedLine,
            approximatePosition,
            surroundingLines
          });
        } catch (error) {
          console.error('Error processing click:', error);
          // Make sure to reset loading state on error
          setXPathClickProcessing(false);
        }
      }
    });

    return () => {
      clickDisposable.dispose();
    };
  }, [editorInstance, content, isCtrlOrCmdPressed, setXPath, worker, setXPathClickProcessing]);

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