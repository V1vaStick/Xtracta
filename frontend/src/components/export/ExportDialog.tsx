import { useState } from 'react';
import { useEditorStore } from '../../store/editorStore';

/**
 * Available export formats
 */
export enum ExportFormat {
  XML_HTML = 'xml-html',
  JSON = 'json',
  PLAIN_TEXT = 'plain-text'
}

/**
 * Props for the ExportDialog component
 */
interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * ExportDialog component for exporting results in different formats
 */
const ExportDialog = ({ isOpen, onClose }: ExportDialogProps) => {
  const { results } = useEditorStore();
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>(ExportFormat.XML_HTML);
  const [fileName, setFileName] = useState('xtracta-results');

  /**
   * Handle format change
   */
  const handleFormatChange = (format: ExportFormat) => {
    setSelectedFormat(format);
  };

  /**
   * Handle file name change
   */
  const handleFileNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileName(e.target.value);
  };

  /**
   * Get the appropriate file extension based on format
   */
  const getFileExtension = (format: ExportFormat): string => {
    switch (format) {
      case ExportFormat.XML_HTML:
        return '.xml';
      case ExportFormat.JSON:
        return '.json';
      case ExportFormat.PLAIN_TEXT:
        return '.txt';
      default:
        return '.xml';
    }
  };

  /**
   * Convert results to the selected format
   */
  const formatResults = (): string => {
    if (!results.length) return '';

    switch (selectedFormat) {
      case ExportFormat.XML_HTML:
        // Return the raw XML/HTML values from results
        return results.map(result => result.value).join('\n');

      case ExportFormat.JSON:
        // Convert to JSON format
        return JSON.stringify(
          results.map(result => ({
            value: result.value,
            path: result.path
          })),
          null,
          2
        );

      case ExportFormat.PLAIN_TEXT:
        // Plain text format with path and value
        return results
          .map(result => `// XPath: ${result.path}\n${result.value}`)
          .join('\n\n');

      default:
        return '';
    }
  };

  /**
   * Handle export button click
   */
  const handleExport = () => {
    // Format the results based on selected format
    const formattedData = formatResults();
    const extension = getFileExtension(selectedFormat);
    const fullFileName = `${fileName}${extension}`;

    // Create a blob with the appropriate MIME type
    let mimeType: string;
    switch (selectedFormat) {
      case ExportFormat.XML_HTML:
        mimeType = 'application/xml';
        break;
      case ExportFormat.JSON:
        mimeType = 'application/json';
        break;
      case ExportFormat.PLAIN_TEXT:
        mimeType = 'text/plain';
        break;
      default:
        mimeType = 'text/plain';
    }

    const blob = new Blob([formattedData], { type: mimeType });
    const url = URL.createObjectURL(blob);

    // Create a download link and trigger it
    const a = document.createElement('a');
    a.href = url;
    a.download = fullFileName;
    document.body.appendChild(a);
    a.click();

    // Clean up
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);

    // Close the dialog
    onClose();
  };

  // If the dialog is not open, don't render anything
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <div className="bg-background p-6 rounded-lg shadow-xl w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Export Results</h2>
        
        {/* Show error if no results */}
        {results.length === 0 ? (
          <div className="text-destructive mb-4">
            No results to export. Please run an XPath query first.
          </div>
        ) : (
          <div className="space-y-4">
            {/* File name input */}
            <div>
              <label 
                htmlFor="file-name" 
                className="block text-sm font-medium mb-1"
              >
                File Name
              </label>
              <input
                id="file-name"
                type="text"
                value={fileName}
                onChange={handleFileNameChange}
                className="w-full px-3 py-2 border border-input rounded-md"
                placeholder="Enter file name"
              />
            </div>
            
            {/* Format selection */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Export Format
              </label>
              <div className="space-y-2">
                <div className="flex items-center">
                  <input
                    type="radio"
                    id="format-xml"
                    name="format"
                    className="mr-2"
                    checked={selectedFormat === ExportFormat.XML_HTML}
                    onChange={() => handleFormatChange(ExportFormat.XML_HTML)}
                  />
                  <label htmlFor="format-xml">
                    XML/HTML ({results.length} {results.length === 1 ? 'node' : 'nodes'})
                  </label>
                </div>
                
                <div className="flex items-center">
                  <input
                    type="radio"
                    id="format-json"
                    name="format"
                    className="mr-2"
                    checked={selectedFormat === ExportFormat.JSON}
                    onChange={() => handleFormatChange(ExportFormat.JSON)}
                  />
                  <label htmlFor="format-json">
                    JSON (with XPath and content)
                  </label>
                </div>
                
                <div className="flex items-center">
                  <input
                    type="radio"
                    id="format-text"
                    name="format"
                    className="mr-2"
                    checked={selectedFormat === ExportFormat.PLAIN_TEXT}
                    onChange={() => handleFormatChange(ExportFormat.PLAIN_TEXT)}
                  />
                  <label htmlFor="format-text">
                    Plain Text (with XPath comments)
                  </label>
                </div>
              </div>
            </div>
            
            {/* Preview (optional feature) */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Preview
              </label>
              <div className="bg-muted p-2 rounded-md h-24 overflow-auto">
                <pre className="text-xs whitespace-pre-wrap">
                  {formatResults().slice(0, 500)}
                  {formatResults().length > 500 ? '...' : ''}
                </pre>
              </div>
            </div>
          </div>
        )}
        
        {/* Actions */}
        <div className="flex justify-end space-x-3 mt-6">
          <button
            className="px-4 py-2 border border-input rounded-md hover:bg-muted transition-colors"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            onClick={handleExport}
            disabled={results.length === 0}
          >
            Export
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportDialog; 