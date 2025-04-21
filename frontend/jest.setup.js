// Setup for Jest tests

// Import testing libraries
import '@testing-library/jest-dom';
import React from 'react';

// Mock the Monaco editor
jest.mock('@monaco-editor/react', () => {
  return {
    __esModule: true,
    default: jest.fn(({ onChange, onMount, value }) => {
      // Simulate the editor mounting with a mock editor instance
      if (onMount) {
        const mockEditor = {
          getValue: jest.fn(() => value || ''),
          setValue: jest.fn(),
          getModel: jest.fn(() => ({
            getPositionAt: jest.fn((offset) => ({
              lineNumber: 1,
              column: offset,
            })),
            getOffsetAt: jest.fn(({ lineNumber, column }) => column),
          })),
          onDidChangeModelContent: jest.fn(),
          onMouseMove: jest.fn(() => ({ dispose: jest.fn() })),
          getScrolledVisiblePosition: jest.fn(() => ({ top: 0, left: 0 })),
          getContainerDomNode: jest.fn(() => ({
            getBoundingClientRect: jest.fn(() => ({
              top: 0,
              left: 0,
              width: 500,
              height: 500,
            })),
          })),
          revealPositionInCenter: jest.fn(),
          setSelection: jest.fn(),
        };
        setTimeout(() => onMount(mockEditor), 0);
      }
      
      // Return a basic div to represent the editor
      return React.createElement('div', { 'data-testid': 'monaco-editor' });
    }),
    editor: {
      IStandaloneCodeEditor: {},
      IEditorOptions: {},
    },
  };
});

// Mock WebWorker
class MockWorker {
  constructor(stringUrl) {
    this.url = stringUrl;
    this.onmessage = jest.fn();
    this.onerror = jest.fn();
  }

  postMessage(msg) {
    // Simulate worker response with a mock message
    if (this.onmessage) {
      setTimeout(() => {
        this.onmessage({
          data: {
            type: 'result',
            matches: [
              { 
                value: '<div>Test</div>', 
                path: '/html/body/div',
                startOffset: 0,
                endOffset: 0,
              }
            ],
            count: 1,
            executionTime: 1
          }
        });
      }, 10);
    }
  }

  terminate() {
    // Clean up
  }
}

// Set up the global Worker constructor to use our mock
global.Worker = MockWorker;

// Mock URL.createObjectURL
if (typeof global.URL.createObjectURL === 'undefined') {
  global.URL.createObjectURL = jest.fn(() => 'mocked-url');
}

// Mock URL.revokeObjectURL
if (typeof global.URL.revokeObjectURL === 'undefined') {
  global.URL.revokeObjectURL = jest.fn();
}

// Mock DOMParser for testing XML/HTML parsing
class MockDOMParser {
  parseFromString(str, type) {
    return document.implementation.createHTMLDocument('').documentElement;
  }
}

global.DOMParser = MockDOMParser; 