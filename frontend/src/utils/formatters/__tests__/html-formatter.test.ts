/**
 * Tests for the HTML formatter utilities
 */

import { formatHtmlOrXml, fallbackFormatter } from '../html-formatter';

// Mock the wasm-fmt module
jest.mock('@wasm-fmt/web_fmt/vite', () => {
  return {
    __esModule: true,
    default: jest.fn().mockResolvedValue(undefined),
    format: jest.fn().mockImplementation((content: string, fileExtension: string) => {
      // Simple mock implementation for tests
      return `<!-- Formatted by wasm-fmt mock (${fileExtension}) -->\n${content.trim()}`;
    }),
  };
});

// Mock for XMLSerializer and DOMParser which aren't available in Jest's jsdom
global.XMLSerializer = jest.fn().mockImplementation(() => ({
  serializeToString: jest.fn().mockImplementation((doc) => {
    return '<html><body><p>Mocked serialized content</p></body></html>';
  }),
}));

global.DOMParser = jest.fn().mockImplementation(() => ({
  parseFromString: jest.fn().mockImplementation((content, mimeType) => {
    // Return a mock document with querySelector for parseError check
    return {
      querySelector: jest.fn().mockReturnValue(null),
    };
  }),
}));

describe('HTML Formatter', () => {
  describe('formatHtmlOrXml', () => {
    it('should format HTML content using wasm-fmt when available', async () => {
      const content = '<html><body><p>Test</p></body></html>';
      const formatted = await formatHtmlOrXml(content, true);
      
      expect(formatted).toContain('Formatted by wasm-fmt mock');
      expect(formatted).toContain('index.html');
      expect(formatted).toContain(content.trim());
    });

    it('should format XML content using wasm-fmt when available', async () => {
      const content = '<root><child>Test</child></root>';
      const formatted = await formatHtmlOrXml(content, false);
      
      expect(formatted).toContain('Formatted by wasm-fmt mock');
      expect(formatted).toContain('file.xml');
      expect(formatted).toContain(content.trim());
    });

    it('should use fallback formatter if wasm-fmt fails', async () => {
      // Create a temporary mock that throws an error
      const originalImport = jest.requireMock('@wasm-fmt/web_fmt/vite');
      const mockFormat = originalImport.format;
      
      originalImport.format = jest.fn().mockImplementation(() => {
        throw new Error('Mock wasm-fmt error');
      });
      
      const content = '<html><body><p>Test</p></body></html>';
      const formatted = await formatHtmlOrXml(content, true);
      
      // Should contain the fallback formatted content
      expect(formatted).toContain('Mocked serialized content');
      
      // Restore the original mock
      originalImport.format = mockFormat;
    });
  });

  describe('fallbackFormatter', () => {
    it('should format HTML content when wasm-fmt is not available', () => {
      const content = '<html><body><p>Test</p></body></html>';
      const formatted = fallbackFormatter(content);
      
      expect(formatted).toContain('Mocked serialized content');
    });

    it('should handle errors gracefully', () => {
      // Mock document.querySelector to simulate a parse error
      const originalQuerySelector = jest.fn().mockReturnValue(null);
      const errorQuerySelector = jest.fn().mockReturnValue({});
      
      const mockDOMParser = global.DOMParser as jest.Mock;
      mockDOMParser.mockImplementation(() => ({
        parseFromString: jest.fn().mockImplementation((content, mimeType) => {
          if (mimeType === 'text/html') {
            return {
              querySelector: errorQuerySelector, // Return a parse error for HTML
            };
          }
          return {
            querySelector: originalQuerySelector, // No error for XML
          };
        }),
      }));
      
      const content = '<invalid>html</missing-tag>';
      const formatted = fallbackFormatter(content);
      
      // Should still return formatted content using the XML parser
      expect(formatted).toContain('Mocked serialized content');
      
      // Restore the original mock
      mockDOMParser.mockImplementation(() => ({
        parseFromString: jest.fn().mockImplementation(() => ({
          querySelector: originalQuerySelector,
        })),
      }));
    });
  });
}); 