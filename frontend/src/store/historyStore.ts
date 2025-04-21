import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Interface for a history item
 */
interface HistoryItem {
  id: string;
  query: string;
  timestamp: number;
  matchCount: number;
}

/**
 * Interface for the history store
 */
interface HistoryState {
  items: HistoryItem[];
  addItem: (query: string, matchCount: number) => void;
  removeItem: (id: string) => void;
  clearHistory: () => void;
}

/**
 * Zustand store for XPath query history with persistence
 */
export const useHistoryStore = create<HistoryState>()(
  persist(
    (set) => ({
      items: [],
      
      addItem: (query, matchCount) => set((state) => {
        // Create a new history item
        const newItem: HistoryItem = {
          id: Date.now().toString(),
          query,
          timestamp: Date.now(),
          matchCount
        };
        
        // Check if we already have this query in history
        const exists = state.items.some(item => item.query === query);
        
        if (exists) {
          // Update existing item
          return {
            items: state.items.map(item =>
              item.query === query
                ? { ...item, timestamp: Date.now(), matchCount }
                : item
            )
          };
        } else {
          // Add new item, limit to 20 items
          return {
            items: [newItem, ...state.items].slice(0, 20)
          };
        }
      }),
      
      removeItem: (id) => set((state) => ({
        items: state.items.filter(item => item.id !== id)
      })),
      
      clearHistory: () => set({ items: [] })
    }),
    {
      name: 'xpath-history',
    }
  )
); 