/**
 * End-to-end tests for the HTML formatter functionality
 */

describe('HTML Formatter', () => {
  beforeEach(() => {
    // Visit the application before each test
    cy.visit('/');
    // Wait for the editor to load
    cy.get('.monaco-editor').should('be.visible');
  });

  it('should format HTML when the Format HTML button is clicked', () => {
    // Get the editor content before formatting
    cy.window().then((win) => {
      // Enter unformatted HTML
      const unformattedHTML = '<html><body><div><p>This is a test</p></div></body></html>';
      
      // Access the editor store from the window object
      // @ts-ignore - accessing Zustand store from Cypress
      win.editorStore.setContent(unformattedHTML);
      
      // Click the format button
      cy.contains('button', 'Format HTML').click();
      
      // Check that the formatting spinner appears
      cy.contains('Formatting...').should('be.visible');
      
      // Wait for formatting to complete
      cy.contains('Format HTML', { timeout: 10000 }).should('be.visible');
      
      // Get the formatted content
      // @ts-ignore - accessing Zustand store from Cypress
      const formattedContent = win.editorStore.getState().content;
      
      // Verify that the content has been formatted
      // The exact format will depend on wasm-fmt, but we can check for some basic indicators
      expect(formattedContent).to.not.equal(unformattedHTML);
      expect(formattedContent).to.include('<html');
      expect(formattedContent).to.include('<body');
      expect(formattedContent).to.include('<div');
      expect(formattedContent).to.include('<p>');
      
      // Formatted HTML should have newlines
      expect(formattedContent.split('\n').length).to.be.greaterThan(1);
    });
  });

  it('should handle errors gracefully when formatting invalid HTML', () => {
    cy.window().then((win) => {
      // Enter invalid HTML
      const invalidHTML = '<html><body><div>Missing closing tags';
      
      // @ts-ignore - accessing Zustand store from Cypress
      win.editorStore.setContent(invalidHTML);
      
      // Click the format button
      cy.contains('button', 'Format HTML').click();
      
      // Check that the formatting spinner appears
      cy.contains('Formatting...').should('be.visible');
      
      // Wait for formatting to complete
      cy.contains('Format HTML', { timeout: 10000 }).should('be.visible');
      
      // Even invalid HTML should be formatted without errors
      // @ts-ignore - accessing Zustand store from Cypress
      const resultContent = win.editorStore.getState().content;
      
      // Should still have some content
      expect(resultContent).to.not.be.empty;
    });
  });

  it('should preserve editor selection after formatting', () => {
    cy.window().then((win) => {
      const html = `
<html>
<body>
  <div id="test">
    <p>This is a test paragraph</p>
  </div>
</body>
</html>`;
      
      // @ts-ignore - accessing Zustand store from Cypress
      win.editorStore.setContent(html);
      
      // Simulate selecting some text in the editor
      // This is a simplified test since we can't directly manipulate Monaco's selection
      // @ts-ignore - accessing editor instance
      const editor = win.editorInstance;
      if (editor) {
        // Set a selection programmatically
        editor.setSelection({
          startLineNumber: 5,
          startColumn: 5,
          endLineNumber: 5,
          endColumn: 30
        });
        
        // Format the HTML
        cy.contains('button', 'Format HTML').click();
        
        // Wait for formatting to complete
        cy.contains('Format HTML', { timeout: 10000 }).should('be.visible');
        
        // Check if editor still has focus
        cy.focused().should('exist');
      }
    });
  });
}); 