import { useState, useCallback, useEffect, useRef } from 'react';
import { Editor } from '@monaco-editor/react';
import { editor as monacoEditor } from 'monaco-editor';
import * as monaco from 'monaco-editor';
import { useEditorStore } from '../../store/editorStore';
import ClickToXPathProvider from './ClickToXPathProvider';
import { formatHtmlOrXml, fallbackFormatter, clearFormatterCache, terminateFormatterWorker } from '../../utils/formatters/html-formatter';

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
  const { content, setContent, results, selectedResultIndex } = useEditorStore();
  const [editorInstance, setEditorInstance] = useState<monacoEditor.IStandaloneCodeEditor | null>(null);
  const [isFormatting, setIsFormatting] = useState(false);
  const [lastSelectionState, setLastSelectionState] = useState<EditorSelection | null>(null);
  const formatButtonRef = useRef<HTMLButtonElement>(null);
  const openFileRef = useRef<HTMLButtonElement>(null);
  const [formatPerformance, setFormatPerformance] = useState<{time: number, size: number} | null>(null);

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
    if (editorInstance && results.length > 0 && selectedResultIndex !== null) {
      const result = results[selectedResultIndex];
      const model = editorInstance.getModel();
      
      if (result.startOffset && result.endOffset && model) {
        const start = model.getPositionAt(result.startOffset);
        const end = model.getPositionAt(result.endOffset);
        
        editorInstance.revealPositionInCenter(start);
        
        editorInstance.setSelection({
          startLineNumber: start.lineNumber,
          startColumn: start.column,
          endLineNumber: end.lineNumber,
          endColumn: end.column
        });
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

  return (
    <div className="h-full flex flex-col relative">
      <div className="flex justify-between items-center mb-4">
        <div className="flex space-x-2 items-center">
          <h2 className="text-xl font-bold text-foreground">Input HTML/XML</h2>
          {formatPerformance && (
            <span className="text-xs text-muted-foreground ml-2">
              Formatted {(formatPerformance.size / 1024).toFixed(1)}KB in {formatPerformance.time.toFixed(1)}ms
            </span>
          )}
        </div>
        <div className="flex items-center space-x-3">
          <button
            ref={openFileRef}
            onClick={handleOpenFile}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all duration-200 flex items-center space-x-2"
            aria-label="Open File"
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
              aria-hidden="true"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" x2="12" y1="15" y2="3"></line>
            </svg>
            <span>Open File</span>
          </button>
          <button
            ref={formatButtonRef}
            onClick={handleFormatXml}
            className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90 focus:outline-none focus:ring-2 focus:ring-secondary/50 transition-all duration-200 flex items-center space-x-2"
            disabled={!content || isFormatting}
            aria-label={isFormatting ? "Formatting HTML/XML..." : "Format HTML"}
            title="Format HTML (Ctrl+Shift+F)"
          >
            {isFormatting ? (
              <>
                <svg 
                  className="animate-spin -ml-1 mr-2 h-5 w-5" 
                  xmlns="http://www.w3.org/2000/svg" 
                  fill="none" 
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <circle 
                    className="opacity-25" 
                    cx="12" 
                    cy="12" 
                    r="10" 
                    stroke="currentColor" 
                    strokeWidth="4"
                  />
                  <path 
                    className="opacity-75" 
                    fill="currentColor" 
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                <span>Formatting...</span>
              </>
            ) : (
              <>
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  className="h-5 w-5"
                  aria-hidden="true"
                >
                  <polyline points="16 3 21 8 8 21 3 21 3 16 16 3"></polyline>
                </svg>
                <span>Format HTML</span>
              </>
            )}
          </button>
        </div>
      </div>
      <div 
        className="border border-input rounded-lg overflow-hidden h-full relative"
        role="region"
        aria-label="HTML/XML Editor"
      >
        <Editor
          height="100%"
          width="100%"
          language="xml"
          theme="vs-light"
          value={content}
          onChange={handleEditorChange}
          onMount={handleEditorDidMount}
          options={{
            selectOnLineNumbers: true,
            roundedSelection: false,
            minimap: { enabled: false },
            readOnly: false,
            cursorStyle: 'line',
            automaticLayout: true,
            scrollBeyondLastLine: false,
            scrollbar: { vertical: 'visible', horizontal: 'visible' },
            lineNumbers: 'on',
            glyphMargin: true,
            folding: true,
            fontSize: 14,
            accessibilitySupport: 'on',
            tabIndex: 0,
          } as monacoEditor.IEditorOptions}
          aria-label="HTML/XML code editor"
        />
        <ClickToXPathProvider editorInstance={editorInstance} />
      </div>
    </div>
  );
};

export default SourceEditor; 