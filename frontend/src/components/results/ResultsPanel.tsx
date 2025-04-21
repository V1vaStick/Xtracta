import { useEditorStore } from '../../store/editorStore';

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
   * Render loading state
   */
  if (isEvaluating) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-2"></div>
          <p className="text-muted-foreground">Evaluating XPath...</p>
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
        <div className="bg-destructive/10 text-destructive p-4 rounded-md max-w-md">
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
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <div className="max-w-md text-center">
          <p>Enter an XPath expression and click "Evaluate" to see results</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-lg font-semibold">Evaluation result</h2>
        <div className="text-sm text-muted-foreground">
          {resultsCount} {resultsCount === 1 ? 'match' : 'matches'} in {formatExecutionTime(executionTime)}
        </div>
      </div>
      
      <div className="flex-1 overflow-auto border rounded-md">
        <ul className="divide-y">
          {results.map((result, index) => (
            <li 
              key={index}
              onClick={() => handleResultClick(index)}
              className={`p-3 cursor-pointer ${selectedResultIndex === index ? 'bg-secondary' : 'hover:bg-secondary/40'}`}
            >
              <div className="flex justify-between items-start mb-1">
                <div className="font-mono text-xs text-primary bg-primary/10 px-1 py-0.5 rounded">
                  {result.path}
                </div>
                <div className="text-xs text-muted-foreground">
                  Node {index + 1}
                </div>
              </div>
              <div className="mt-1 p-2 bg-muted/30 rounded overflow-x-auto">
                <pre className="text-xs whitespace-pre-wrap">
                  {result.value}
                </pre>
              </div>
            </li>
          ))}
        </ul>
      </div>
      
      <div className="mt-2 flex justify-end">
        <button 
          className="text-xs text-muted-foreground hover:text-primary"
          onClick={() => {
            // This would be implemented with actual download functionality
            alert('Download functionality would be implemented here');
          }}
        >
          Download Results
        </button>
      </div>
    </div>
  );
};

export default ResultsPanel; 