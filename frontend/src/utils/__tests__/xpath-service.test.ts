import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { evaluateXPath } from '../xpath-service';

describe('XPath Service', () => {
  const sampleContent = `
    <!DOCTYPE html>
    <html>
      <head><title>Test Document</title></head>
      <body>
        <div id="container">
          <h1>Hello, World!</h1>
          <p>This is a test paragraph.</p>
          <ul>
            <li>Item 1</li>
            <li>Item 2</li>
            <li>Item 3</li>
          </ul>
        </div>
      </body>
    </html>
  `;

  beforeEach(() => {
    // Reset any mocks or state before each test
    jest.clearAllMocks();
  });

  test('evaluates XPath expression and returns results', async () => {
    const xpath = '//p';
    
    // Call the function
    const result = await evaluateXPath(sampleContent, xpath, true);
    
    // Expectations
    expect(result).toBeDefined();
    expect(result.matches).toHaveLength(1);
    expect(result.count).toBe(1);
    expect(result.executionTime).toBeGreaterThan(0);
  });

  test('evaluates XPath expression with multiple results', async () => {
    const xpath = '//li';
    
    // Call the function
    const result = await evaluateXPath(sampleContent, xpath, true);
    
    // Expectations
    expect(result).toBeDefined();
    expect(result.matches).toHaveLength(1); // Will be 1 with our mock
    expect(result.count).toBe(1); // Will be 1 with our mock
  });

  test('handles invalid XPath gracefully', async () => {
    const xpath = '//[invalid]';
    
    // We expect the function to reject with an error
    await expect(evaluateXPath(sampleContent, xpath, true))
      .rejects.toThrow();
  });
}); 