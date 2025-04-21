/**
 * HTML Formatter utility using wasm-fmt/web_fmt
 * 
 * This formatter provides superior HTML formatting compared to the basic XML formatter.
 * It uses the wasm-fmt/web_fmt package which provides WebAssembly-powered formatting
 * for HTML, CSS, JavaScript, TypeScript, and more.
 */

// Static import of the WebAssembly module to avoid MIME type issues
import * as wasmFmt from '@wasm-fmt/web_fmt/vite';

// Cache for formatted results to avoid redundant processing
interface CacheEntry {
  content: string;
  timestamp: number;
  formattedContent: string;
}

// Simple LRU-like cache with a maximum size and time-based expiration
class FormatterCache {
  private cache: Map<string, CacheEntry> = new Map();
  private readonly maxSize: number = 20;
  private readonly expirationMs: number = 5 * 60 * 1000; // 5 minutes

  public get(content: string, isHtml: boolean): string | null {
    const key = this.getKey(content, isHtml);
    const entry = this.cache.get(key);
    
    if (!entry) return null;
    
    // Check if the entry has expired
    if (Date.now() - entry.timestamp > this.expirationMs) {
      this.cache.delete(key);
      return null;
    }
    
    // Update timestamp to mark as recently used
    entry.timestamp = Date.now();
    return entry.formattedContent;
  }
  
  public set(content: string, isHtml: boolean, formattedContent: string): void {
    const key = this.getKey(content, isHtml);
    
    // Ensure the cache doesn't exceed the max size
    if (this.cache.size >= this.maxSize) {
      // Remove the oldest entry
      let oldestKey: string | null = null;
      let oldestTime = Infinity;
      
      for (const [k, entry] of this.cache.entries()) {
        if (entry.timestamp < oldestTime) {
          oldestTime = entry.timestamp;
          oldestKey = k;
        }
      }
      
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }
    
    this.cache.set(key, {
      content,
      timestamp: Date.now(),
      formattedContent
    });
  }
  
  public clear(): void {
    this.cache.clear();
  }
  
  private getKey(content: string, isHtml: boolean): string {
    // Create a cache key based on content and format type
    // We use a hash-like approach to avoid storing the full content as keys
    const prefix = isHtml ? 'html:' : 'xml:';
    const contentHash = this.simpleHash(content);
    return `${prefix}${contentHash}`;
  }
  
  private simpleHash(str: string): string {
    // Simple hash function for cache keys
    // This is not cryptographically secure, just for cache identification
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(16);
  }
}

// Singleton cache instance
const formatterCache = new FormatterCache();

// Flag to track initialization
let isWasmFmtInitialized = false;

/**
 * Initialize the WebAssembly module
 */
async function initWasmFmt() {
  if (!isWasmFmtInitialized) {
    try {
      // Initialize the module
      await wasmFmt.default();
      isWasmFmtInitialized = true;
    } catch (error) {
      console.error('Error initializing WebAssembly module:', error);
      throw error;
    }
  }
}

/**
 * Format HTML/XML content using wasm-fmt in the main thread
 * 
 * @param content - The HTML/XML content to format
 * @param isHtml - Whether the content is HTML (true) or XML (false) 
 * @returns The formatted content
 */
export async function formatWithWasmFmt(content: string, isHtml: boolean = true): Promise<string> {
  // Check cache first
  const cachedResult = formatterCache.get(content, isHtml);
  if (cachedResult) {
    return cachedResult;
  }
  
  try {
    // Ensure the module is initialized
    await initWasmFmt();
    
    // Format the content using the appropriate file extension
    const fileExtension = isHtml ? 'index.html' : 'file.xml';
    const formatted = wasmFmt.format(content, fileExtension);
    
    // Cache the result
    formatterCache.set(content, isHtml, formatted);
    
    return formatted;
  } catch (error) {
    console.error('Error formatting with wasm-fmt:', error);
    return fallbackFormatter(content);
  }
}

/**
 * Fallback formatter using basic XML formatting techniques
 * This is used if the wasm-fmt module is not available
 * 
 * @param xml - The XML/HTML content to format
 * @returns The formatted content
 */
export function fallbackFormatter(xml: string): string {
  // Check cache first
  const cachedResult = formatterCache.get(xml, true) || formatterCache.get(xml, false);
  if (cachedResult) {
    return cachedResult;
  }
  
  try {
    // Simple XML formatting function
    const parser = new DOMParser();
    
    // Try to parse as HTML first, falling back to XML if needed
    let doc;
    let isHtml = true;
    
    try {
      doc = parser.parseFromString(xml, 'text/html');
      // Check if parsing failed
      const parseError = doc.querySelector('parsererror');
      if (parseError) {
        // Fall back to XML parsing
        isHtml = false;
        doc = parser.parseFromString(xml, 'text/xml');
      }
    } catch (e) {
      // If HTML parsing fails, try XML
      isHtml = false;
      doc = parser.parseFromString(xml, 'text/xml');
    }
    
    // Use browser's XML serializer for formatting
    const serializer = new XMLSerializer();
    const xmlString = serializer.serializeToString(doc);
    
    // Use a simple indentation approach
    const formatted = xmlString
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
    
    // Cache the result
    formatterCache.set(xml, isHtml, formatted);
    
    return formatted;
  } catch (error) {
    console.error('Error in fallbackFormatter:', error);
    return xml; // Return original content on error
  }
}

/**
 * Main formatter function that tries to use wasm-fmt first, falling back to basic formatting if needed
 * 
 * @param content - The HTML/XML content to format
 * @param isHtml - Whether the content is HTML (true) or XML (false)
 * @returns The formatted content
 */
export async function formatHtmlOrXml(content: string, isHtml: boolean = true): Promise<string> {
  // Skip formatting for very small content
  if (content.trim().length < 10) {
    return content;
  }
  
  try {
    return await formatWithWasmFmt(content, isHtml);
  } catch (error) {
    console.error('Error formatting with wasm-fmt, falling back to basic formatter:', error);
    return fallbackFormatter(content);
  }
}

/**
 * Clear the formatter cache
 * This can be useful when memory needs to be freed or when formatting rules change
 */
export function clearFormatterCache(): void {
  formatterCache.clear();
}

/**
 * Reset the formatter
 * Maintains API compatibility with the previous implementation
 */
export function terminateFormatterWorker() {
  isWasmFmtInitialized = false;
} 