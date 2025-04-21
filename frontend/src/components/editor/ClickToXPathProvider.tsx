import { useEffect, useState } from 'react';
import { editor } from 'monaco-editor';
import { useEditorStore } from '../../store/editorStore';
import { generateXPathForPosition, XPathFormat } from '../../utils/dom-position-mapper';

/**
 * ClickToXPathProvider component that adds click-to-XPath functionality to the Monaco editor
 * @param {object} props - Component props
 * @param {editor.IStandaloneCodeEditor} props.editorInstance - Monaco editor instance
 */
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

  // Helper function to generate precise XPath
  const generatePreciseXPath = (tagInfo: { name: string, attributes: string }) => {
    // Start with tag name
    let xpath = `//${tagInfo.name.toLowerCase()}`;
    
    // Parse attributes from the tag
    const attributeMatches = tagInfo.attributes.match(/([a-zA-Z0-9_\-:]+)=["']([^"']*)["']/g);
    
    if (attributeMatches && attributeMatches.length > 0) {
      // Add attributes to make the XPath more precise
      const attributes = attributeMatches.map(attr => {
        const [name, value] = attr.split('=');
        return `@${name}=${value}`;
      });
      
      // Add class and id first as they're most distinctive
      const classAttr = attributes.find(attr => attr.startsWith('@class='));
      const idAttr = attributes.find(attr => attr.startsWith('@id='));
      
      if (idAttr) {
        // ID is best for unique identification
        xpath += `[${idAttr}]`;
      } else if (classAttr) {
        // Class is good too
        xpath += `[${classAttr}]`;
      } else if (attributes.length > 0) {
        // Otherwise use the first available attribute
        xpath += `[${attributes[0]}]`;
      }
    }
    
    return xpath;
  };

  // Helper to generate absolute XPath with high precision
  const generateAbsoluteXPath = (doc: Document, tags: Array<any>, clickedTag: any) => {
    try {
      // 1. Try to find an element with exactly matching attributes
      const tagName = clickedTag.name.toLowerCase();
      const fullTag = clickedTag.fullTag;
      
      // Extract attributes
      const attributesMatch = fullTag.match(/<[a-zA-Z][a-zA-Z0-9\-_:]*\s+([^>]*)>/);
      const attributesStr = attributesMatch ? attributesMatch[1] : '';
      
      // Generate query selector parts
      let selector = tagName;
      
      // Add class if present
      const classMatch = attributesStr.match(/class=["']([^"']*)["']/);
      if (classMatch) {
        const classes = classMatch[1].split(/\s+/).filter((c: string) => c);
        classes.forEach((className: string) => {
          selector += `.${className}`;
        });
      }
      
      // Add id if present
      const idMatch = attributesStr.match(/id=["']([^"']*)["']/);
      if (idMatch) {
        selector += `#${idMatch[1]}`;
      }
      
      // Try to find the element in the document
      let element: Element | null = null;
      
      // If we have ID, it's fastest to find by ID
      if (idMatch) {
        element = doc.getElementById(idMatch[1]);
      } 
      // Otherwise, try to use the selector
      else if (selector !== tagName) {
        try {
          element = doc.querySelector(selector);
        } catch (e) {
          // If selector is invalid, we'll fall back to the next method
        }
      }
      
      // If we found an element, generate an accurate XPath
      if (element) {
        // Build parent path - this is the most accurate approach
        let path = '';
        let current: Element | null = element;
        
        while (current && current.nodeType === Node.ELEMENT_NODE) {
          // Get tag name and position
          const tag = current.tagName.toLowerCase();
          
          // Count position
          let pos = 1;
          let sib = current.previousElementSibling;
          
          while (sib) {
            if (sib.tagName.toLowerCase() === tag) {
              pos++;
            }
            sib = sib.previousElementSibling;
          }
          
          // Add to path
          path = `/${tag}[${pos}]${path}`;
          
          // Move up to parent
          current = current.parentElement;
        }
        
        // Ensure path starts with / (absolute path)
        if (!path.startsWith('/')) {
          path = '/' + path;
        }
        
        return path;
      }
      
      // If DOM querying approach failed, use tag positions to create an absolute path
      const findElementPath = (tagName: string, tagIndex: number) => {
        // Start with the document
        const allElements = doc.getElementsByTagName(tagName);
        if (tagIndex < allElements.length) {
          const element = allElements[tagIndex];
          let path = '';
          let current: Element | null = element;
          
          while (current && current.nodeType === Node.ELEMENT_NODE) {
            // Get tag name and position
            const tag = current.tagName.toLowerCase();
            
            // Count position
            let pos = 1;
            let sib = current.previousElementSibling;
            
            while (sib) {
              if (sib.tagName.toLowerCase() === tag) {
                pos++;
              }
              sib = sib.previousElementSibling;
            }
            
            // Add to path
            path = `/${tag}[${pos}]${path}`;
            
            // Move up to parent
            current = current.parentElement;
          }
          
          return path;
        }
        return null;
      };
      
      // Calculate position among tags with the same name
      let position = 0; // 0-based
      for (const tag of tags) {
        if (tag.name.toLowerCase() === tagName && 
            !tag.isClosing && 
            tag.start <= clickedTag.start) {
          if (tag.start === clickedTag.start) {
            break;
          }
          position++;
        }
      }
      
      // Try to get the path using tag position
      const elementPath = findElementPath(tagName, position);
      if (elementPath) {
        return elementPath;
      }
      
      // Last resort: build a simplified absolute path with attribute
      // Start with the document root
      let rootPath = "/html";
      
      // Add body if it's likely part of an HTML document
      if (doc.body) {
        rootPath += "/body";
      }
      
      // Add tag name with position
      const absolutePath = `${rootPath}//`;
      
      // Include attribute if available for more precision
      if (attributesStr) {
        // Try to include class or id for more precision
        const idMatch = attributesStr.match(/id=["']([^"']*)["']/);
        const classMatch = attributesStr.match(/class=["']([^"']*)["']/);
        
        if (idMatch) {
          return `${absolutePath}${tagName}[@id="${idMatch[1]}"][${position + 1}]`;
        } else if (classMatch) {
          return `${absolutePath}${tagName}[@class="${classMatch[1]}"][${position + 1}]`;
        }
      }
      
      // Simplest absolute fallback
      return `${absolutePath}${tagName}[${position + 1}]`;
    } catch (error) {
      console.error('Error generating precise XPath:', error);
      // Fallback to a simple but absolute XPath
      return "/html//body//" + clickedTag.name.toLowerCase() + "[1]";
    }
  };

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
          // Get character offset from position
          const model = editorInstance.getModel();
          if (!model) return;
          
          const offset = model.getOffsetAt({ lineNumber, column });
          
          // Analyze the content around the cursor to find the current tag
          // We'll look at a window of text surrounding the cursor
          const windowStart = Math.max(0, offset - 100);
          const windowEnd = Math.min(content.length, offset + 100);
          const textWindow = content.substring(windowStart, windowEnd);
          
          // Find all tags in this window
          const tagRegex = /<\/?([a-zA-Z][a-zA-Z0-9\-_:]*)([^>]*)>/g;
          const tags = [];
          let match;
          
          while ((match = tagRegex.exec(textWindow)) !== null) {
            const tagStart = windowStart + match.index;
            const tagEnd = tagStart + match[0].length;
            const isClosingTag = match[0].startsWith('</');
            
            tags.push({
              name: match[1],
              fullTag: match[0],
              start: tagStart,
              end: tagEnd,
              isClosing: isClosingTag,
              attributes: match[2] || ''
            });
          }
          
          // Find tag closest to cursor
          let closestTag = null;
          let minDistance = Infinity;
          
          for (const tag of tags) {
            // Check if cursor is inside this tag
            if (offset >= tag.start && offset <= tag.end) {
              closestTag = tag;
              break;
            }
            
            // Otherwise find closest tag
            const distance = Math.min(
              Math.abs(offset - tag.start),
              Math.abs(offset - tag.end)
            );
            
            if (distance < minDistance) {
              minDistance = distance;
              closestTag = tag;
            }
          }
          
          if (closestTag) {
            // Use DOM parser to parse content
            const parser = new DOMParser();
            const doc = parser.parseFromString(content, 'text/html');
            
            // Generate absolute XPath with high precision for the clicked element
            const absoluteXPath = generateAbsoluteXPath(doc, tags, closestTag);
            
            // Use the precise XPath
            setXPath(absoluteXPath);
            
          } else {
            // Fallback to the traditional approach
            const parser = new DOMParser();
            const doc = parser.parseFromString(content, 'text/html');
            
            // Get XPath for this position using our utility function
            const result = generateXPathForPosition(doc, content, offset);
            
            if (result) {
              // Use absolute XPath for precision
              setXPath(result.alternativeXPaths[XPathFormat.ABSOLUTE]);
            }
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