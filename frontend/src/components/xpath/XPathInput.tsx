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
    } catch (error: any) {
      setError(error.message || 'Error evaluating XPath');
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

  return (
    <div className="relative">
      <div className="flex items-center mb-2">
        <h2 className="text-lg font-semibold">XPath Query</h2>
      </div>
      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <input
            ref={inputRef}
            type="text"
            value={xpath}
            onChange={(e) => setXPath(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter XPath expression (e.g., //div[@class='container'])"
            className="w-full p-2 border rounded-md bg-card text-foreground"
          />
          {historyItems.length > 0 && (
            <button
              type="button"
              onClick={() => setShowHistory(!showHistory)}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-muted-foreground"
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
          
          {showHistory && historyItems.length > 0 && (
            <div 
              ref={historyRef}
              className="absolute z-10 mt-1 w-full bg-popover shadow-lg rounded-md border border-border max-h-60 overflow-auto"
            >
              <div className="p-2 text-xs font-medium text-muted-foreground">History</div>
              <ul>
                {historyItems.map((item) => (
                  <li 
                    key={item.id}
                    onClick={() => selectHistoryItem(item.query)}
                    className="px-4 py-2 hover:bg-muted cursor-pointer flex justify-between"
                  >
                    <span className="text-sm truncate">{item.query}</span>
                    <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                      <span>{item.matchCount} matches</span>
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
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
        >
          Evaluate
        </button>
      </div>
      <div className="mt-2 text-xs text-muted-foreground">
        Press Ctrl+Enter or Cmd+Enter to evaluate
      </div>
    </div>
  );
};

export default XPathInput; 