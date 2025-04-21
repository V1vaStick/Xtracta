import { useState, useCallback, useEffect } from 'react';
import { Editor } from '@monaco-editor/react';
import { editor } from 'monaco-editor';
import { useEditorStore } from '../../store/editorStore';

/**
 * Source Editor component for XML/HTML documents
 */
const SourceEditor = () => {
  const { content, setContent, isPrettyPrinted, results, selectedResultIndex } = useEditorStore();
  const [editorInstance, setEditorInstance] = useState<editor.IStandaloneCodeEditor | null>(null);

  /**
   * Handle editor mount
   */
  const handleEditorDidMount = useCallback((editor: editor.IStandaloneCodeEditor) => {
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
  }, [content, setContent]);

  /**
   * Simple XML formatter
   */
  const formatXml = (xml: string): string => {
    // Simple XML formatting function
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xml, 'text/xml');
    
    // Use browser's XML serializer for formatting
    const serializer = new XMLSerializer();
    const xmlString = serializer.serializeToString(xmlDoc);
    
    // Use a simple indentation approach
    return xmlString
      .replace(/></g, '>\n<')
      .split('\n')
      .map((line, index, arr) => {
        // Determine indentation level
        const indentLevel = arr
          .slice(0, index)
          .reduce((acc, curr) => {
            const opens = (curr.match(/<[^/]/g) || []).length;
            const closes = (curr.match(/<\//g) || []).length;
            return acc + (opens - closes);
          }, 0);
        
        return ' '.repeat(indentLevel * 2) + line.trim();
      })
      .join('\n');
  };

  /**
   * Format the current content
   */
  const formatDocument = useCallback(() => {
    if (editorInstance) {
      const formatted = formatXml(content);
      editorInstance.setValue(formatted);
      setContent(formatted);
    }
  }, [content, editorInstance, setContent]);

  /**
   * Update content when isPrettyPrinted changes
   */
  useEffect(() => {
    if (editorInstance && content) {
      if (isPrettyPrinted) {
        formatDocument();
      }
    }
  }, [isPrettyPrinted, content, editorInstance, formatDocument]);

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

  const handleOpenFile = () => {
    // Implement file opening logic
    console.log('Open file clicked');
  };

  const handleFormatXml = () => {
    if (!content) return;

    try {
      // Basic XML formatting
      const formattedXml = formatXml(content);
      setContent(formattedXml);
    } catch (error) {
      console.error('Error formatting XML:', error);
    }
  };

  const handleEditorChange = useCallback((value: string | undefined) => {
    if (value !== undefined) {
      setContent(value);
    }
  }, [setContent]);

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <div className="flex space-x-2 items-center">
          <h2 className="text-xl font-bold text-foreground">Input HTML/XML</h2>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={handleOpenFile}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all duration-200 flex items-center space-x-2"
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
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" x2="12" y1="15" y2="3"></line>
            </svg>
            <span>Open File</span>
          </button>
          <button
            onClick={handleFormatXml}
            className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90 focus:outline-none focus:ring-2 focus:ring-secondary/50 transition-all duration-200 flex items-center space-x-2"
            disabled={!content}
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
              <polyline points="16 3 21 8 8 21 3 21 3 16 16 3"></polyline>
            </svg>
            <span>Format XML</span>
          </button>
        </div>
      </div>
      <div className="border border-input rounded-lg overflow-hidden h-full">
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
            wordWrap: 'on',
            readOnly: false,
            cursorStyle: 'line',
            automaticLayout: true,
            scrollBeyondLastLine: false,
            scrollbar: { vertical: 'visible', horizontal: 'visible' },
            lineNumbers: 'on',
            glyphMargin: true,
            folding: true,
            fontSize: 14,
          } as editor.IEditorOptions}
        />
      </div>
    </div>
  );
};

export default SourceEditor; 