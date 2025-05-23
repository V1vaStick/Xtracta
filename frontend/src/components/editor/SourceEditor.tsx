import { useState, useCallback, useEffect, useRef } from 'react';
import { Editor } from '@monaco-editor/react';
import { editor as monacoEditor } from 'monaco-editor';
import * as monaco from 'monaco-editor';
import { useEditorStore } from '../../store/editorStore';
import ClickToXPathProvider from './ClickToXPathProvider';
import { formatHtmlOrXml, fallbackFormatter, clearFormatterCache, terminateFormatterWorker } from '../../utils/formatters/html-formatter';
import { useTheme } from '../../utils/ThemeProvider';

// Define a type for editor selections to avoid importing internal monaco types
interface EditorSelection {
  startLineNumber: number;
  startColumn: number;
  endLineNumber: number;
  endColumn: number;
}

/**
 * Source Editor component for XML/HTML documents
 */
const SourceEditor = () => {
  const { content, setContent, results, selectedResultIndex, isXPathClickProcessing } = useEditorStore();
  const [editorInstance, setEditorInstance] = useState<monacoEditor.IStandaloneCodeEditor | null>(null);
  const [isFormatting, setIsFormatting] = useState(false);
  const [lastSelectionState, setLastSelectionState] = useState<EditorSelection | null>(null);
  const formatButtonRef = useRef<HTMLButtonElement>(null);
  const openFileRef = useRef<HTMLButtonElement>(null);
  const [formatPerformance, setFormatPerformance] = useState<{time: number, size: number} | null>(null);
  // Track decorations to clear them before adding new ones
  const decorationsRef = useRef<string[]>([]);
  
  // Track Ctrl/Cmd key state for XPath tooltip
  const [isCtrlPressed, setIsCtrlPressed] = useState(false);
  const { theme } = useTheme();
  
  // Editor configuration state
  const [editorConfig, setEditorConfig] = useState({
    wordWrap: 'off',
    lineNumbers: 'on',
    minimap: false
  });
  const [showConfigPopup, setShowConfigPopup] = useState(false);

  /**
   * Set up key event listeners for Ctrl/Cmd key
   */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        setIsCtrlPressed(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Control' || e.key === 'Meta') {
        setIsCtrlPressed(false);
      }
    };

    // Add event listeners
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      // Remove event listeners
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);
  
  /**
   * Apply editor configuration
   */
  useEffect(() => {
    if (editorInstance) {
      editorInstance.updateOptions({
        wordWrap: editorConfig.wordWrap as 'off' | 'on' | 'wordWrapColumn' | 'bounded',
        lineNumbers: editorConfig.lineNumbers as 'on' | 'off' | 'relative' | 'interval' | ((lineNumber: number) => string),
        minimap: { enabled: editorConfig.minimap }
      });
    }
  }, [editorConfig, editorInstance]);

  /**
   * Handle editor mount
   */
  const handleEditorDidMount = useCallback((editor: monacoEditor.IStandaloneCodeEditor) => {
    setEditorInstance(editor);

    // Load sample content if editor is empty
    if (!content) {
      const sampleContent = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <title>Sample XPath Playground Document</title>
  </head>
  <body>
    <div id="root" class="container">
      <header>
        <h1>Welcome to XPath Playground</h1>
        <nav>
          <ul>
            <li><a href="#home">Home</a></li>
            <li><a href="#about">About</a></li>
            <li><a href="#contact">Contact</a></li>
          </ul>
        </nav>
      </header>
      
      <main>
        <section id="content">
          <article class="post">
            <h2>Sample Article</h2>
            <p>This is a sample paragraph to demonstrate XPath querying.</p>
            <div class="metadata">
              <span class="author">John Doe</span>
              <span class="date">2023-06-15</span>
            </div>
          </article>
          
          <div class="sidebar">
            <h3>Related Links</h3>
            <ul>
              <li><a href="#">Link 1</a></li>
              <li><a href="#">Link 2</a></li>
              <li><a href="#">Link 3</a></li>
            </ul>
          </div>
        </section>
      </main>
      
      <footer>
        <p>&copy; 2023 XPath Playground</p>
      </footer>
    </div>
  </body>
</html>`;
      
      setContent(sampleContent);
      
      // Null check for editorInstance
      if (editor) {
        editor.setValue(sampleContent);
      }
    }

    // Add keyboard shortcuts for formatting
    editor.addCommand(
      monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyF,
      () => {
        handleFormatXml();
      }
    );
    
    // Make editor instance available to window for testing
    if (typeof window !== 'undefined') {
      (window as any).editorInstance = editor;
    }
  }, [content, setContent]);

  /**
   * Save selection state before formatting
   */
  const saveSelectionState = useCallback(() => {
    if (editorInstance) {
      const selection = editorInstance.getSelection();
      if (selection) {
        setLastSelectionState({
          startLineNumber: selection.startLineNumber,
          startColumn: selection.startColumn,
          endLineNumber: selection.endLineNumber,
          endColumn: selection.endColumn
        });
      }
    }
  }, [editorInstance]);

  /**
   * Restore selection after formatting
   */
  const restoreSelectionState = useCallback(() => {
    if (editorInstance && lastSelectionState) {
      editorInstance.setSelection({
        startLineNumber: lastSelectionState.startLineNumber,
        startColumn: lastSelectionState.startColumn,
        endLineNumber: lastSelectionState.endLineNumber,
        endColumn: lastSelectionState.endColumn
      });
      editorInstance.revealPositionInCenter({
        lineNumber: lastSelectionState.startLineNumber,
        column: lastSelectionState.startColumn
      });
      editorInstance.focus();
    }
  }, [editorInstance, lastSelectionState]);

  /**
   * Format the current content
   */
  const formatDocument = useCallback(async () => {
    if (editorInstance && content) {
      try {
        setIsFormatting(true);
        saveSelectionState();
        
        const startTime = performance.now();
        
        // Attempt to use the enhanced formatter first with HTML mode
        const formatted = await formatHtmlOrXml(content, true);
        
        const endTime = performance.now();
        setFormatPerformance({
          time: endTime - startTime,
          size: content.length
        });
        
        editorInstance.setValue(formatted);
        setContent(formatted);
        
        // Restore cursor position after formatting
        setTimeout(() => {
          restoreSelectionState();
        }, 50);
      } catch (error) {
        console.error('Error formatting document:', error);
      } finally {
        setIsFormatting(false);
      }
    }
  }, [content, editorInstance, setContent, saveSelectionState, restoreSelectionState]);

  /**
   * Clean up resources when component unmounts
   */
  useEffect(() => {
    // Return cleanup function
    return () => {
      console.log('SourceEditor unmounting, cleaning up resources');
      // Terminate the formatter worker when component unmounts
      terminateFormatterWorker();
    };
  }, []);

  /**
   * Highlight results in the editor
   */
  useEffect(() => {
    if (editorInstance && results.length > 0) {
      const model = editorInstance.getModel();
      
      if (model) {
        // Clear previous decorations
        if (decorationsRef.current.length > 0) {
          decorationsRef.current = editorInstance.deltaDecorations(decorationsRef.current, []);
        }

        // Prepare all decorations
        const allDecorations: monaco.editor.IModelDeltaDecoration[] = [];
        let selectedMatchRange: monaco.Range | null = null;

        // Create decorations for all matches first with default styling
        results.forEach((match, index) => {
          if (match.startOffset !== undefined && match.endOffset !== undefined &&
              match.startOffset >= 0 && match.endOffset > match.startOffset) {
            
            // Ensure offsets are within valid range
            const safeStartOffset = Math.min(match.startOffset, model.getValue().length - 1);
            const safeEndOffset = Math.min(match.endOffset, model.getValue().length);
            
            try {
              const matchStart = model.getPositionAt(safeStartOffset);
              const matchEnd = model.getPositionAt(safeEndOffset);
              
              // Determine if this is the selected match
              const isSelected = index === selectedResultIndex;
              
              // Create the range object
              const matchRange = new monaco.Range(
                matchStart.lineNumber,
                matchStart.column,
                matchEnd.lineNumber,
                matchEnd.column
              );
              
              // Save selected match range for scrolling
              if (isSelected) {
                selectedMatchRange = matchRange;
              }
              
              // Create the decoration
              const decoration = {
                range: matchRange,
                options: {
                  inlineClassName: isSelected ? 'xpath-match-highlight' : 'xpath-match-secondary',
                  className: isSelected ? 'xpath-match-highlight-line' : 'xpath-match-secondary-line',
                  isWholeLine: false,
                  overviewRuler: {
                    color: isSelected ? '#2563eb' : '#9ca3af',
                    position: monaco.editor.OverviewRulerLane.Center
                  },
                  minimap: {
                    color: isSelected ? '#2563eb' : '#9ca3af',
                    position: monaco.editor.MinimapPosition.Inline
                  },
                  zIndex: isSelected ? 10 : 5
                }
              };
              
              // Add to all decorations list
              allDecorations.push(decoration);
            } catch (err) {
              console.error('Error creating decoration for match:', index, err);
            }
          }
        });

        // Apply all decorations at once
        if (allDecorations.length > 0) {
          console.log(`Applying ${allDecorations.length} decorations for ${results.length} matches`);
          decorationsRef.current = editorInstance.deltaDecorations([], allDecorations);
          
          // Scroll to selected match if available
          if (selectedMatchRange && selectedResultIndex !== null) {
            // Ensure we're using a small delay for the reveal to allow decorations to apply first
            setTimeout(() => {
              editorInstance.revealRangeInCenterIfOutsideViewport(selectedMatchRange!);
              
              // Log which element is being focused
              console.log('Focused on element:', {
                index: selectedResultIndex,
                value: results[selectedResultIndex]?.value.substring(0, 100) + 
                      (results[selectedResultIndex]?.value.length > 100 ? '...' : '')
              });
            }, 50);
          }
        }
      }
    }
  }, [results, selectedResultIndex, editorInstance]);

  /**
   * Clean up performance stats after a delay
   */
  useEffect(() => {
    if (formatPerformance) {
      const timer = setTimeout(() => {
        setFormatPerformance(null);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [formatPerformance]);

  const handleOpenFile = () => {
    // Implement file opening logic
    console.log('Open file clicked');
  };

  const handleFormatXml = async () => {
    if (!content || isFormatting) return;

    try {
      setIsFormatting(true);
      saveSelectionState();
      
      const startTime = performance.now();
      
      // Use the enhanced formatter with wasm-fmt
      const formattedXml = await formatHtmlOrXml(content, true);
      
      const endTime = performance.now();
      setFormatPerformance({
        time: endTime - startTime,
        size: content.length
      });
      
      setContent(formattedXml);
      if (editorInstance) {
        editorInstance.setValue(formattedXml);
      }
      
      // Restore cursor position after formatting
      setTimeout(() => {
        restoreSelectionState();
      }, 50);
    } catch (error) {
      console.error('Error formatting HTML/XML:', error);
      // Fallback to the basic formatter if the enhanced one fails
      try {
        saveSelectionState();
        const formattedXml = fallbackFormatter(content);
        setContent(formattedXml);
        if (editorInstance) {
          editorInstance.setValue(formattedXml);
        }
        setTimeout(() => {
          restoreSelectionState();
        }, 50);
      } catch (fallbackError) {
        console.error('Error in fallback formatter:', fallbackError);
      }
    } finally {
      setIsFormatting(false);
      // Focus on the format button for better keyboard accessibility
      if (formatButtonRef.current) {
        formatButtonRef.current.focus();
      }
    }
  };

  const handleEditorChange = useCallback((value: string | undefined) => {
    if (value !== undefined) {
      setContent(value);
    }
  }, [setContent]);

  /**
   * Toggle editor configuration options
   */
  const toggleEditorConfig = (key: keyof typeof editorConfig, value: any) => {
    setEditorConfig(prevConfig => ({
      ...prevConfig,
      [key]: value
    }));
  };
  
  /**
   * Close the config popup when clicking outside
   */
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      
      // Check if the click was on the config button (don't close if it was)
      if (target.closest('.config-button')) {
        return;
      }
      
      // If the popup is open and the click was outside the popup, close it
      if (showConfigPopup && !target.closest('.config-popup')) {
        setShowConfigPopup(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showConfigPopup]);

  return (
    <div className="relative h-full flex flex-col rounded-2xl p-6 shadow-md border source-container overflow-hidden w-full transition-colors duration-200"
         style={{ 
           backgroundColor: 'hsl(var(--card))', 
           color: 'hsl(var(--card-foreground))',
           borderColor: 'hsl(var(--border))'
         }}>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold flex-shrink-0" style={{ color: 'hsl(var(--foreground))' }}>Source Code</h2>
        <div className="flex items-center space-x-2">
          <button
            className="config-button p-2 rounded-md transition-colors"
            onClick={() => setShowConfigPopup(!showConfigPopup)}
            title="Editor Settings"
            style={{ 
              backgroundColor: showConfigPopup ? 'hsl(var(--accent))' : 'transparent',
              color: 'hsl(var(--muted-foreground))'
            }}
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              className="h-5 w-5"
            >
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
          </button>
          <button
            ref={openFileRef}
            onClick={handleOpenFile}
            className="btn btn-sm"
            title="Open File (Ctrl+O)"
          >
            Open File
          </button>
          <button 
            ref={formatButtonRef}
            onClick={handleFormatXml}
            className="btn btn-sm"
            disabled={isFormatting}
            title="Format XML (Ctrl+Shift+F)"
          >
            {isFormatting ? 'Formatting...' : 'Format'}
          </button>
        </div>
      </div>
      
      {/* Editor Configuration Popup */}
      {showConfigPopup && (
        <div 
          className="config-popup absolute top-16 right-6 z-20 w-64 p-4 rounded-lg shadow-lg border"
          style={{ 
            backgroundColor: 'hsl(var(--popover))', 
            borderColor: 'hsl(var(--border))'
          }}
        >
          <h3 className="text-sm font-semibold mb-3" style={{ color: 'hsl(var(--foreground))' }}>Editor Settings</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <label className="text-sm" style={{ color: 'hsl(var(--foreground))' }}>Word Wrap</label>
              <div className="relative inline-block w-10 h-5 rounded-full transition-colors"
                   style={{ backgroundColor: editorConfig.wordWrap === 'on' ? 'hsl(var(--primary))' : 'hsl(var(--muted))' }}
                   onClick={() => toggleEditorConfig('wordWrap', editorConfig.wordWrap === 'on' ? 'off' : 'on')}>
                <span 
                  className="absolute left-0.5 top-0.5 w-4 h-4 rounded-full transition-transform duration-200 transform"
                  style={{ 
                    backgroundColor: 'white',
                    transform: editorConfig.wordWrap === 'on' ? 'translateX(20px)' : 'translateX(0)'
                  }}
                ></span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <label className="text-sm" style={{ color: 'hsl(var(--foreground))' }}>Line Numbers</label>
              <div className="relative inline-block w-10 h-5 rounded-full transition-colors"
                   style={{ backgroundColor: editorConfig.lineNumbers === 'on' ? 'hsl(var(--primary))' : 'hsl(var(--muted))' }}
                   onClick={() => toggleEditorConfig('lineNumbers', editorConfig.lineNumbers === 'on' ? 'off' : 'on')}>
                <span 
                  className="absolute left-0.5 top-0.5 w-4 h-4 rounded-full transition-transform duration-200 transform"
                  style={{ 
                    backgroundColor: 'white',
                    transform: editorConfig.lineNumbers === 'on' ? 'translateX(20px)' : 'translateX(0)'
                  }}
                ></span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <label className="text-sm" style={{ color: 'hsl(var(--foreground))' }}>Minimap</label>
              <div className="relative inline-block w-10 h-5 rounded-full transition-colors"
                   style={{ backgroundColor: editorConfig.minimap ? 'hsl(var(--primary))' : 'hsl(var(--muted))' }}
                   onClick={() => toggleEditorConfig('minimap', !editorConfig.minimap)}>
                <span 
                  className="absolute left-0.5 top-0.5 w-4 h-4 rounded-full transition-transform duration-200 transform"
                  style={{ 
                    backgroundColor: 'white',
                    transform: editorConfig.minimap ? 'translateX(20px)' : 'translateX(0)'
                  }}
                ></span>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* XPath generation tooltip/indicator */}
      <div className={`
        absolute top-20 right-6 z-10 py-1 px-3 rounded-full text-sm 
        transition-all duration-300 flex items-center
        ${isCtrlPressed ? 'opacity-100' : 'opacity-0'}
      `} style={{ 
        backgroundColor: 'hsl(var(--muted))', 
        color: 'hsl(var(--muted-foreground))'
      }}>
        <span className="inline-block w-2 h-2 bg-green-500 mr-2 rounded-full"></span>
        Click any element to generate XPath
      </div>
      
      <div className="flex-1 overflow-hidden relative">
        <Editor
          className="h-full"
          defaultLanguage="html"
          theme={theme === 'dark' ? 'vs-dark' : 'vs-light'}
          value={content}
          onChange={(value) => {
            if (value !== undefined) {
              setContent(value);
            }
          }}
          onMount={handleEditorDidMount}
          options={{
            minimap: { enabled: editorConfig.minimap },
            scrollBeyondLastLine: false,
            smoothScrolling: true,
            cursorBlinking: 'smooth',
            wordWrap: editorConfig.wordWrap as 'off' | 'on' | 'wordWrapColumn' | 'bounded',
            wrappingIndent: 'indent',
            automaticLayout: true,
            lineNumbers: editorConfig.lineNumbers as 'on' | 'off',
            glyphMargin: false,
            renderWhitespace: 'none',
            folding: true,
            autoIndent: 'full',
            formatOnPaste: true,
            largeFileOptimizations: true,
            occurrencesHighlight: 'off',
            wrappingStrategy: 'advanced',
          }}
        />
        <ClickToXPathProvider editorInstance={editorInstance} />
      </div>
    </div>
  );
};

export default SourceEditor; 