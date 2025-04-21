# Xtracta State Management

This directory contains the Zustand stores used for state management in the Xtracta application.

## Files

- `editorStore.ts`: Main store for managing editor state, XPath evaluation, and results

## Editor Store (`editorStore.ts`)

The editor store manages all state related to the editor, XPath evaluations, and results.

### State Interface

```typescript
interface EditorState {
  // Source content
  content: string;
  setContent: (content: string) => void;
  
  // Editor formatting
  isPrettyPrinted: boolean;
  toggleFormatting: () => void;
  
  // XPath query
  xpath: string;
  setXPath: (xpath: string) => void;
  
  // Evaluation results
  results: Array<{
    value: string;
    path: string;
    startOffset?: number;
    endOffset?: number;
  }>;
  resultsCount: number;
  executionTime: number;
  setResults: (results: Array<{
    value: string;
    path: string;
    startOffset?: number;
    endOffset?: number;
  }>, executionTime: number) => void;
  
  // Loading states
  isEvaluating: boolean;
  setIsEvaluating: (isEvaluating: boolean) => void;
  
  // Errors
  error: string | null;
  setError: (error: string | null) => void;
  
  // Selected result
  selectedResultIndex: number | null;
  setSelectedResultIndex: (index: number | null) => void;
}
```

### Key Features

1. **Content Management**:
   - Stores the current XML/HTML content
   - Provides methods to update content

2. **Formatting Control**:
   - Manages pretty-printing state
   - Provides toggle function for formatting

3. **XPath Query Management**:
   - Stores the current XPath expression
   - Provides methods to update the expression

4. **Results Management**:
   - Stores evaluation results including:
     - Result values (node content)
     - XPath paths for each node
     - Text positions (offsets) for highlighting
   - Tracks result count and execution time
   - Manages selected result for highlighting

5. **UI State Management**:
   - Tracks evaluation loading state
   - Manages error state for evaluation failures

## Usage Examples

```tsx
import { useEditorStore } from '../store/editorStore';

// Component using the editor store
const XPathEvaluator = () => {
  const { 
    content, 
    xpath, 
    setXPath, 
    isEvaluating, 
    setIsEvaluating,
    setResults,
    setError
  } = useEditorStore();

  const handleEvaluate = async () => {
    if (!content || !xpath) return;
    
    try {
      setIsEvaluating(true);
      setError(null);
      
      // Perform evaluation logic
      const startTime = performance.now();
      const results = await evaluateXPath(content, xpath, true);
      const executionTime = performance.now() - startTime;
      
      // Update store with results
      setResults(results.matches, executionTime);
    } catch (error) {
      setError(error.message || 'Error evaluating XPath');
    } finally {
      setIsEvaluating(false);
    }
  };

  return (
    <div>
      <input 
        value={xpath} 
        onChange={(e) => setXPath(e.target.value)} 
        placeholder="Enter XPath expression"
      />
      <button onClick={handleEvaluate} disabled={isEvaluating}>
        {isEvaluating ? 'Evaluating...' : 'Evaluate'}
      </button>
    </div>
  );
};
```

## Best Practices

1. **Selective State Usage**: Only extract the specific state pieces you need in components.
2. **Action Usage**: Use the provided actions for state updates rather than direct manipulation.
3. **State Structure**: Keep related state together for better organization.
4. **Performance**: Use state selectors to prevent unnecessary re-renders. 