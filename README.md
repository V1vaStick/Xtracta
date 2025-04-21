# Xtracta - XPath Playground

An open-source XPath playground built with React 19 + TypeScript + Tailwind CSS + shadcn/ui on the frontend and Node.js 20 LTS + Express on the backend.

## Features

- XML/HTML source editor with syntax highlighting & line numbers
- XPath input box with history, auto-complete and validation
- Evaluate XPath expressions with results display
- Synchronized inline highlights of matched nodes
- Pretty-Print / Minify toggle for source
- Hover-to-XPath: get XPath for any element by hovering
- Download result nodes as new XML/HTML
- Keyboard shortcuts for format and evaluation

## Development

### Requirements

- Node.js 20 LTS
- Docker and Docker Compose (for containerized development)

### Getting Started

#### Using Docker

1. Clone this repository
2. Run the development environment:
   ```
   docker-compose up
   ```
3. Open your browser at [http://localhost:3000](http://localhost:3000)

#### Local Development

1. Clone this repository
2. Install frontend dependencies:
   ```
   cd frontend
   npm install
   ```
3. Install backend dependencies:
   ```
   cd backend
   npm install
   ```
4. Start the frontend development server:
   ```
   cd frontend
   npm run dev
   ```
5. Start the backend development server:
   ```
   cd backend
   npm run dev
   ```
6. Open your browser at [http://localhost:3000](http://localhost:3000)

## License

MIT

## Acknowledgements

- [React](https://react.dev/)
- [Vite](https://vitejs.dev/)
- [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [shadcn/ui](https://ui.shadcn.com/)
- [Monaco Editor](https://microsoft.github.io/monaco-editor/)
- [Express](https://expressjs.com/) 