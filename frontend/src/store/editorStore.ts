import { create } from 'zustand';

/**
 * Interface for editor state
 */
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

/**
 * Zustand store for editor state
 */
export const useEditorStore = create<EditorState>((set) => ({
  // Source content
  content: '',
  setContent: (content) => set({ content }),
  
  // Editor formatting
  isPrettyPrinted: true,
  toggleFormatting: () => set((state) => ({ isPrettyPrinted: !state.isPrettyPrinted })),
  
  // XPath query
  xpath: '',
  setXPath: (xpath) => set({ xpath }),
  
  // Evaluation results
  results: [],
  resultsCount: 0,
  executionTime: 0,
  setResults: (results, executionTime) => set({ 
    results, 
    resultsCount: results.length,
    executionTime,
    error: null
  }),
  
  // Loading states
  isEvaluating: false,
  setIsEvaluating: (isEvaluating) => set({ isEvaluating }),
  
  // Errors
  error: null,
  setError: (error) => set({ error }),
  
  // Selected result
  selectedResultIndex: null,
  setSelectedResultIndex: (selectedResultIndex) => set({ selectedResultIndex }),
})); 