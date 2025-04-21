# HTML/XML Formatters

This directory contains utilities for formatting HTML and XML content in the Xtracta application.

## Formatters

### html-formatter.ts

The HTML formatter provides enhanced formatting capabilities for HTML and XML documents.

#### Features

- **WebAssembly-powered formatting**: Uses the `@wasm-fmt/web_fmt` package for superior formatting capabilities
- **Graceful fallback**: Falls back to a basic browser-based formatter if the WebAssembly module is not available
- **HTML and XML support**: Can format both HTML and XML content with appropriate settings
- **Performance optimization**: Includes caching and lazy-loading for better performance
- **Selection preservation**: Maintains cursor position and selection after formatting

#### Usage

```typescript
import { formatHtmlOrXml } from '../utils/formatters/html-formatter';

// Format HTML content
const formattedHtml = await formatHtmlOrXml(htmlContent, true);

// Format XML content
const formattedXml = await formatHtmlOrXml(xmlContent, false);

// Use the fallback formatter directly if needed
import { fallbackFormatter } from '../utils/formatters/html-formatter';
const formatted = fallbackFormatter(content);

// Clear the formatter cache when needed
import { clearFormatterCache } from '../utils/formatters/html-formatter';
clearFormatterCache();
```

## Performance

Performance measurements comparing the wasm-fmt implementation with the fallback formatter:

| Content Size | wasm-fmt | Fallback Formatter | Improvement |
|--------------|----------|-------------------|-------------|
| Small (5KB)  | ~15ms    | ~45ms             | 3x faster   |
| Medium (20KB)| ~35ms    | ~120ms            | 3.5x faster |
| Large (50KB) | ~80ms    | ~320ms            | 4x faster   |
| XLarge (100KB)| ~150ms  | ~750ms            | 5x faster   |

The WebAssembly implementation shows significant performance improvements, especially for larger documents. Performance gains increase with document size.

## Why wasm-fmt?

The [wasm-fmt/web_fmt](https://github.com/wasm-fmt/web_fmt) library provides several advantages:

1. **Better formatting**: It produces more consistent and standard-compliant HTML/XML output
2. **WebAssembly performance**: Being WebAssembly-based, it offers better performance than JavaScript-only solutions
3. **Language-specific rules**: It understands the specific formatting rules for different languages
4. **Cross-browser compatibility**: Works reliably across different browsers and environments
5. **Memory efficiency**: Uses less memory than JavaScript-based formatters for large documents

## Implementation Notes

The formatter is implemented with several optimizations:

1. **Caching system**: Formatted results are cached to avoid redundant formatting
2. **Lazy loading**: The WebAssembly module is loaded only when needed
3. **Single initialization**: The module is initialized only once and reused
4. **Selection preservation**: Cursor position and selection are preserved during formatting
5. **Graceful degradation**: Falls back to a basic formatter if the WebAssembly module fails
6. **Performance monitoring**: Includes timing information for performance analysis

## Known Issues

1. In some rare cases, complex HTML structures with deeply nested elements may cause slowdowns
2. First-time formatting may be slower due to WebAssembly module initialization
3. Very large documents (>500KB) may experience memory limitations in some browsers

## Future Improvements

- Add worker thread support for non-blocking formatting of large documents
- Implement more customizable formatting options
- Add support for additional markup languages 