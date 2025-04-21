# Xtracta Utilities

This directory contains utility functions and services used throughout the Xtracta application.

## Files

- `xpath-service.ts`: Service for evaluating XPath expressions against XML/HTML content
- `dom-position-mapper.ts`: Utilities for mapping positions in text to DOM nodes and generating XPath expressions

## XPath Service (`xpath-service.ts`)

The XPath service provides functionality for evaluating XPath expressions against XML/HTML content. It handles both client-side and server-side evaluation based on content size.

### Key Functions

#### `evaluateXPath(content: string, xpathExpression: string, isHtml: boolean = false): Promise<XPathResult>`

Evaluates an XPath expression against XML/HTML content.

- **Parameters**:
  - `content`: The XML/HTML content to evaluate against
  - `xpathExpression`: The XPath expression to evaluate
  - `isHtml`: Whether the content is HTML (true) or XML (false)
- **Returns**: A Promise resolving to an XPathResult object containing matches, count, and execution time

### Internal Implementation

The service uses different evaluation strategies based on content size:
- Small documents (<5MB): Uses WebWorker for client-side evaluation
- Large documents (≥5MB): Uses backend API for server-side evaluation

## DOM Position Mapper (`dom-position-mapper.ts`)

The DOM Position Mapper provides utilities for mapping positions in text to DOM nodes and generating XPath expressions for those nodes.

### XPath Formats

The utility supports multiple XPath formats:
- `ABSOLUTE`: Full path from root (e.g., `/html/body/div[1]/p[2]`)
- `ID_BASED`: Shortest path using IDs (e.g., `//*[@id='content']/p[2]`)
- `SHORT`: Shortened path with attributes (e.g., `//p[@class='info']`)

### Key Functions

#### `generateXPathForPosition(doc: Document, content: string, offset: number): XPathResult | null`

Finds the DOM node at a specific character offset and generates XPath expressions for it.

- **Parameters**:
  - `doc`: The parsed DOM document
  - `content`: The source content as a string
  - `offset`: The character offset in the source string
- **Returns**: An XPathResult object with various XPath expressions for the node, or null if no node is found

#### `findNodeAtOffset(doc: Document, content: string, offset: number): Node | null`

Finds the DOM node at a specific character offset in the content.

- **Parameters**:
  - `doc`: The parsed DOM document
  - `content`: The source content as a string
  - `offset`: The character offset
- **Returns**: The DOM node at the given offset, or null if not found

#### `generateXPathForNode(node: Node, format: XPathFormat = XPathFormat.ABSOLUTE): string`

Generates an XPath expression for a DOM node using the specified format.

- **Parameters**:
  - `node`: The DOM node
  - `format`: The desired XPath format
- **Returns**: The XPath string

#### `getElementDisplayName(node: Node): string`

Gets a human-readable display name for a DOM node.

- **Parameters**:
  - `node`: The DOM node
- **Returns**: A string representing the element for display purposes

## Usage Examples

```typescript
// Evaluate an XPath expression
import { evaluateXPath } from './xpath-service';

const content = '<html><body><div>Test</div></body></html>';
const xpath = '//div';

evaluateXPath(content, xpath, true)
  .then(result => {
    console.log(`Found ${result.count} matches in ${result.executionTime}ms`);
    console.log(result.matches);
  })
  .catch(error => {
    console.error('Error evaluating XPath:', error);
  });

// Generate XPath for a position in the content
import { generateXPathForPosition, XPathFormat } from './dom-position-mapper';

const parser = new DOMParser();
const doc = parser.parseFromString(content, 'text/html');
const offset = content.indexOf('<div>');

const result = generateXPathForPosition(doc, content, offset);
if (result) {
  console.log('Absolute XPath:', result.alternativeXPaths[XPathFormat.ABSOLUTE]);
  console.log('ID-based XPath:', result.alternativeXPaths[XPathFormat.ID_BASED]);
  console.log('Short XPath:', result.alternativeXPaths[XPathFormat.SHORT]);
}
``` 