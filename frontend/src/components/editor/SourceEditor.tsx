import { useEffect, useRef } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import { useEditorStore } from '../../store/editorStore';

/**
 * Source Editor component for XML/HTML documents
 */
const SourceEditor = () => {
  const { content, setContent, isPrettyPrinted, results, selectedResultIndex } = useEditorStore();
  const editorRef = useRef<any>(null);

  /**
   * Handle editor mount
   */
  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;

    // Set up XML language configuration
    monaco.languages.registerDocumentFormattingEditProvider('xml', {
      provideDocumentFormattingEdits: (model) => {
        const text = model.getValue();
        const formatted = formatXml(text);
        return [
          {
            range: model.getFullModelRange(),
            text: formatted,
          },
        ];
      },
    });

    // Set up editor options
    editor.updateOptions({
      minimap: { enabled: true },
      scrollBeyondLastLine: false,
      automaticLayout: true,
      wordWrap: 'on',
      wrappingIndent: 'indent',
    });

    // Load sample content if editor is empty
    if (!content) {
      const sampleContent = `<html>
  <body>
    <h1>Sample XML</h1>
    <div class="container">
      <p>Hello World</p>
    </div>
  </body>
</html>`;
      setContent(sampleContent);
      editor.setValue(sampleContent);
    }
  };

  /**
   * Simple XML formatter
   */
  const formatXml = (xml: string): string => {
    // This is a simple formatting implementation
    // In a production app, you would use a more robust XML formatter
    try {
      let formatted = '';
      let indent = '';
      const tab = '  ';
      xml.split(/>\s*</).forEach((node) => {
        if (node.match(/^\/\w/)) {
          // Decrease indent before closing tag
          indent = indent.substring(tab.length);
        }
        formatted += indent + '<' + node + '>\n';
        if (node.match(/^<?\w[^>]*[^\/]$/) && !node.startsWith("?")) {
          // Increase indent after opening tag
          indent += tab;
        }
      });
      return formatted.substring(1, formatted.length - 2);
    } catch (e) {
      // Return original text if formatting fails
      console.error('Error formatting XML:', e);
      return xml;
    }
  };

  /**
   * Format the current content
   */
  const formatDocument = () => {
    if (editorRef.current) {
      const formatted = formatXml(content);
      editorRef.current.setValue(formatted);
      setContent(formatted);
    }
  };

  /**
   * Update content when isPrettyPrinted changes
   */
  useEffect(() => {
    if (editorRef.current && content) {
      if (isPrettyPrinted) {
        formatDocument();
      } else {
        // Minify by removing whitespace (simple approach)
        const minified = content
          .replace(/\s+</g, '<')
          .replace(/>\s+/g, '>')
          .replace(/\s+\/>/g, '/>');
        editorRef.current.setValue(minified);
        setContent(minified);
      }
    }
  }, [isPrettyPrinted]);

  /**
   * Highlight results in the editor
   */
  useEffect(() => {
    // This would be implemented in a more complete version 
    // with actual decoration support from Monaco
    // Currently just demonstrates the concept
    if (editorRef.current && results.length > 0 && selectedResultIndex !== null) {
      const result = results[selectedResultIndex];
      if (result.startOffset && result.endOffset) {
        editorRef.current.revealPositionInCenter({
          lineNumber: editorRef.current.getModel().getPositionAt(result.startOffset).lineNumber,
          column: editorRef.current.getModel().getPositionAt(result.startOffset).column
        });
        
        // Select the text
        const start = editorRef.current.getModel().getPositionAt(result.startOffset);
        const end = editorRef.current.getModel().getPositionAt(result.endOffset);
        editorRef.current.setSelection({
          startLineNumber: start.lineNumber,
          startColumn: start.column,
          endLineNumber: end.lineNumber,
          endColumn: end.column
        });
      }
    }
  }, [selectedResultIndex, results]);

  const handleOpenFile = () => {
    // Implementation of handleOpenFile
  };

  const handleFormatXml = () => {
    // Implementation of handleFormatXml
  };

  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) {
      setContent(value);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-2">
        <div className="flex space-x-2 items-center">
          <h2 className="text-lg font-semibold">Input HTML/XML</h2>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleOpenFile}
            className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 transition-colors"
          >
            Open File
          </button>
          <button
            onClick={handleFormatXml}
            className="px-3 py-1 bg-gray-200 text-gray-800 rounded text-sm hover:bg-gray-300 transition-colors"
            disabled={!content}
          >
            Format XML
          </button>
        </div>
      </div>
      <div className="border border-gray-300 rounded overflow-hidden h-full">
        <Editor
          height="100%"
          width="100%"
          language="xml"
          theme="vs-light"
          value={content}
          onChange={handleEditorChange}
          options={{
            selectOnLineNumbers: true,
            roundedSelection: false,
            readOnly: false,
            cursorStyle: 'line',
            automaticLayout: true,
            scrollBeyondLastLine: false,
            minimap: { enabled: false },
            scrollbar: { vertical: 'visible', horizontal: 'visible' },
            lineNumbers: 'on',
            glyphMargin: true,
            folding: true,
            fontSize: 14,
          }}
        />
      </div>
    </div>
  );
};

export default SourceEditor; 