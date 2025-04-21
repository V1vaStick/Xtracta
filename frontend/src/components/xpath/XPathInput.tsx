import { useState, useEffect, useRef, KeyboardEvent } from 'react';
import { useEditorStore } from '../../store/editorStore';
import { useHistoryStore } from '../../store/historyStore';
import { evaluateXPath } from '../../utils/xpath-service';

/**
 * XPath Input component
 * Allows users to enter XPath expressions and view history
 */
const XPathInput = () => {
  const { xpath, setXPath, content, setIsEvaluating, setError, setResults } = useEditorStore();
  const { items: historyItems, addItem } = useHistoryStore();
  
  const [showHistory, setShowHistory] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const historyRef = useRef<HTMLDivElement>(null);

  // Close history dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (historyRef.current && !historyRef.current.contains(event.target as Node)) {
        setShowHistory(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  /**
   * Evaluate XPath expression
   */
  const handleEvaluateXPath = async () => {
    if (!xpath.trim()) {
      setError('Please enter an XPath expression');
      return;
    }

    if (!content.trim()) {
      setError('Please enter some XML/HTML content');
      return;
    }

    try {
      setIsEvaluating(true);
      setError(null);

      console.log('Evaluating XPath:', xpath);

      // Use our evaluation service
      const result = await evaluateXPath(content, xpath, true);
      
      // Update store with results
      setResults(result.matches, result.executionTime);
      
      // Add to history
      addItem(xpath, result.count);
    } catch (error: unknown) {
      if (error instanceof Error) {
        setError(error.message || 'Error evaluating XPath');
      } else {
        setError('An unknown error occurred');
      }
    } finally {
      setIsEvaluating(false);
    }
  };

  /**
   * Handle keyboard shortcuts
   */
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    // Ctrl+Enter or Cmd+Enter to evaluate
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      handleEvaluateXPath();
    }
  };

  /**
   * Select a history item
   */
  const selectHistoryItem = (query: string) => {
    setXPath(query);
    setShowHistory(false);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  /**
   * Format date for history item
   */
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  /**
   * Copy XPath to clipboard
   */
  const handleCopyXPath = () => {
    if (xpath) {
      navigator.clipboard.writeText(xpath).then(() => {
        // Optional: Add a temporary visual feedback
        console.log('XPath copied to clipboard');
      }).catch(err => {
        console.error('Failed to copy XPath: ', err);
      });
    }
  };

  return (
    <div className="relative">
      <div className="flex items-center mb-4">
        <h2 className="text-xl font-bold text-foreground">XPath Query</h2>
      </div>
      <div className="flex items-center space-x-4">
        <div className="relative flex-1">
          <input
            ref={inputRef}
            type="text"
            value={xpath}
            onChange={(e) => setXPath(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter XPath expression (e.g., //div[@class='container'])"
            className="w-full p-3 pr-30 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all duration-200 placeholder-muted-foreground"
          />
          <div className="absolute right-1 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
            {xpath && (
              <button
                type="button"
                onClick={handleCopyXPath}
                className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-accent"
                title="Copy XPath"
              >
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  className="h-4 w-4"
                >
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
              </button>
            )}
            {historyItems.length > 0 && (
              <button
                type="button"
                onClick={() => setShowHistory(!showHistory)}
                className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-accent"
                title="Show History"
              >
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  className="h-4 w-4"
                >
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>
            )}
          </div>
          
          {showHistory && historyItems.length > 0 && (
            <div 
              ref={historyRef}
              className="absolute z-10 mt-2 w-full bg-popover shadow-lg rounded-lg border border-border max-h-60 overflow-auto"
            >
              <div className="p-3 text-sm font-semibold text-muted-foreground border-b border-border">Query History</div>
              <ul>
                {historyItems.map((item) => (
                  <li 
                    key={item.id}
                    onClick={() => selectHistoryItem(item.query)}
                    className="px-4 py-3 hover:bg-accent cursor-pointer flex justify-between items-center transition-colors"
                  >
                    <span className="text-sm truncate flex-1 mr-2">{item.query}</span>
                    <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                      <span className="bg-muted px-2 py-1 rounded-md">{item.matchCount} matches</span>
                      <span>{formatDate(item.timestamp)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <button
          onClick={handleEvaluateXPath}
          className="px-5 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all duration-200 flex items-center space-x-2"
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
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
          <span>Evaluate</span>
        </button>
      </div>
      <div className="mt-3 text-xs text-muted-foreground">
        💡 Tip: Press <kbd className="bg-muted px-1.5 py-0.5 rounded-md mx-1 border border-border">Ctrl</kbd>+<kbd className="bg-muted px-1.5 py-0.5 rounded-md border border-border">Enter</kbd> to evaluate
      </div>
    </div>
  );
};

export default XPathInput; 