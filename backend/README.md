# Xtracta Backend API

This directory contains the Node.js backend services for the Xtracta XPath playground application.

## Architecture

The backend is built using:
- **Node.js 20 LTS**: For the server runtime
- **Express**: For the API framework
- **TypeScript**: For type safety and code quality
- **Worker Threads**: For CPU-intensive XPath processing

## API Endpoints

### XPath Evaluation

**Endpoint**: `POST /api/xpath/evaluate`

Evaluates an XPath expression against the provided XML/HTML content.

**Request Body**:
```json
{
  "content": "<html><body><div>Hello</div></body></html>",
  "xpath": "//div",
  "isHtml": true
}
```

- `content` (string, required): The XML/HTML content to evaluate against
- `xpath` (string, required): The XPath expression to evaluate
- `isHtml` (boolean, optional): Whether the content is HTML (true) or XML (false), defaults to false

**Response**:
```json
{
  "matches": [
    {
      "value": "<div>Hello</div>",
      "path": "/html/body/div[1]",
      "startOffset": 12,
      "endOffset": 28
    }
  ],
  "count": 1,
  "executionTime": 42
}
```

- `matches`: Array of matching nodes
  - `value`: String content of the matched node
  - `path`: XPath to the matched node
  - `startOffset`: Character offset in the original content where the node starts
  - `endOffset`: Character offset where the node ends
- `count`: Total number of matches
- `executionTime`: Time in milliseconds taken to execute the query

**Error Response**:
```json
{
  "error": "Invalid XPath expression: //[invalid"
}
```

### Health Check

**Endpoint**: `GET /api/health`

Returns the health status of the API service.

**Response**:
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "uptime": 3600
}
```

## Implementation Details

### Worker Threads

For large documents, the evaluation is performed in a separate worker thread to avoid blocking the main event loop.

Flow:
1. Request is received and validated
2. If content size exceeds threshold, processing is offloaded to worker thread
3. Worker thread evaluates XPath and streams results back
4. Results are accumulated and returned to the client

### Security Measures

- **Request Size Limit**: Maximum content size is 25MB
- **Rate Limiting**: 100 requests per hour per IP address
- **CORS**: Configured to allow requests only from the frontend origin
- **Input Validation**: All inputs are validated before processing

## Development

### Prerequisites

- Node.js 20.x or higher
- npm 9.x or higher

### Setup

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Start the server
npm start

# Development mode with hot reload
npm run dev
```

### Environment Variables

Create a `.env` file with the following variables:

```
PORT=3001
CORS_ORIGIN=http://localhost:5173
MAX_CONTENT_SIZE_MB=25
```

## Deployment

The backend is designed to run in a containerized environment. A Dockerfile is provided for building a production image.

```bash
# Build the image
docker build -t xtracta-backend .

# Run the container
docker run -p 3001:3001 xtracta-backend
```

See the `docker-compose.yml` file in the project root for a complete deployment setup. 