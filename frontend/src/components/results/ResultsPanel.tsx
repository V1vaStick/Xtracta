import { useState } from 'react';
import { useEditorStore } from '../../store/editorStore';
import ExportDialog from '../export/ExportDialog';

/**
 * Results Panel component
 * Displays XPath evaluation results
 */
const ResultsPanel = () => {
  const { 
    results, 
    resultsCount, 
    executionTime, 
    isEvaluating, 
    error,
    selectedResultIndex,
    setSelectedResultIndex
  } = useEditorStore();
  
  // State for managing export dialog
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);

  /**
   * Format execution time
   */
  const formatExecutionTime = (time: number) => {
    if (time < 1) {
      return '<1ms';
    } else if (time < 1000) {
      return `${Math.round(time)}ms`;
    } else {
      return `${(time / 1000).toFixed(2)}s`;
    }
  };

  /**
   * Handle click on a result item
   */
  const handleResultClick = (index: number) => {
    setSelectedResultIndex(index);
  };
  
  /**
   * Open export dialog
   */
  const handleOpenExportDialog = () => {
    setIsExportDialogOpen(true);
  };
  
  /**
   * Close export dialog
   */
  const handleCloseExportDialog = () => {
    setIsExportDialogOpen(false);
  };

  /**
   * Render loading state
   */
  if (isEvaluating) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 mb-2" style={{ borderColor: 'hsl(var(--primary))' }}></div>
          <p style={{ color: 'hsl(var(--muted-foreground))' }}>Evaluating XPath...</p>
        </div>
      </div>
    );
  }

  /**
   * Render error state
   */
  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="p-4 rounded-md max-w-md" style={{ 
          backgroundColor: 'hsl(var(--destructive) / 0.1)', 
          color: 'hsl(var(--destructive))' 
        }}>
          <h3 className="font-medium mb-2">Error</h3>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  /**
   * Render empty state
   */
  if (results.length === 0) {
    return (
      <div className="h-full flex items-center justify-center" style={{ color: 'hsl(var(--muted-foreground))' }}>
        <div className="max-w-md text-center">
          <p>Enter an XPath expression and click "Evaluate" to see results</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Export Dialog */}
      <ExportDialog 
        isOpen={isExportDialogOpen} 
        onClose={handleCloseExportDialog} 
      />
      
      <div className="flex justify-between items-center mb-2 flex-shrink-0">
        <div className="text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>
          {resultsCount} {resultsCount === 1 ? 'match' : 'matches'} in {formatExecutionTime(executionTime)}
        </div>
        <button 
          className="px-3 py-1.5 rounded-md text-sm flex items-center space-x-1 transition-colors duration-200 hover:opacity-90"
          style={{ 
            backgroundColor: 'hsl(var(--primary))', 
            color: 'hsl(var(--primary-foreground))' 
          }}
          onClick={handleOpenExportDialog}
          disabled={results.length === 0}
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width="16" 
            height="16" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            className="mr-1"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" x2="12" y1="15" y2="3"></line>
          </svg>
          Export
        </button>
      </div>
      
      <div className="flex-1 overflow-auto rounded-md min-h-0 transition-colors duration-200 border"
           style={{ borderColor: 'hsl(var(--border))' }}>
        <ul className="divide-y" style={{ borderColor: 'hsl(var(--border))' }}>
          {results.map((result, index) => (
            <li 
              key={index}
              onClick={() => handleResultClick(index)}
              className={`p-3 cursor-pointer result-item transition-colors duration-200 ${selectedResultIndex === index ? 'bg-secondary text-secondary-foreground' : 'hover:bg-secondary/40'}`}
              style={selectedResultIndex === index ? {
                backgroundColor: 'hsl(var(--secondary))',
                color: 'hsl(var(--secondary-foreground))'
              } : undefined}
            >
              <div className="flex justify-between items-start mb-1">
                <div className="font-mono text-xs px-1 py-0.5 rounded max-w-[90%] overflow-x-auto" 
                     style={{ 
                       backgroundColor: 'hsl(var(--primary) / 0.1)', 
                       color: 'hsl(var(--primary))' 
                     }}>
                  {result.path}
                </div>
                <div className="text-xs shrink-0 ml-2" style={{ color: 'hsl(var(--muted-foreground))' }}>
                  #{index + 1}
                </div>
              </div>
              <div className="mt-1 p-2 rounded" style={{ backgroundColor: 'hsl(var(--muted) / 0.3)' }}>
                <pre className="text-xs whitespace-pre-wrap break-all result-value">
                  {result.value}
                </pre>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default ResultsPanel; 