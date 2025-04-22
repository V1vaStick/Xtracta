# Development Guide for Xtracta

This document provides detailed instructions for setting up, developing, and extending Xtracta. Whether you're fixing bugs, adding features, or simply exploring the codebase, this guide will help you get started.

## Table of Contents

- [Development Environment Setup](#development-environment-setup)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Build and Deployment](#build-and-deployment)
- [Testing](#testing)
- [Code Style and Standards](#code-style-and-standards)
- [Common Development Tasks](#common-development-tasks)
- [Troubleshooting](#troubleshooting)

## Development Environment Setup

### Prerequisites

- **Node.js**: Version 20 LTS or higher
- **npm**: Version 9.x or higher (included with Node.js)
- **Docker and Docker Compose**: For containerized development (optional)
- **Git**: For version control

### Setting Up the Development Environment

#### Option 1: Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/mnhlt/Xtracta.git
   cd xtracta
   ```

2. **Install Frontend Dependencies**
   ```bash
   cd frontend
   npm install
   ```

3. **Install Backend Dependencies**
   ```bash
   cd ../backend
   npm install
   ```

4. **Start the Frontend Development Server**
   ```bash
   cd ../frontend
   npm run dev
   ```

5. **Start the Backend Development Server (in a new terminal)**
   ```bash
   cd backend
   npm run dev
   ```

6. **Access the Application**
   Open your browser at [http://localhost:3000](http://localhost:3000)

#### Option 2: Using Docker

1. **Clone the repository**
   ```bash
   git clone https://github.com/mnhlt/Xtracta.git
   cd xtracta
   ```

2. **Start the Docker Development Environment**
   ```bash
   docker-compose up
   ```

3. **Access the Application**
   Open your browser at [http://localhost:3000](http://localhost:3000)

## Project Structure

The project is organized into two main directories:

### Frontend (`/frontend`)

```
frontend/
├── cypress/             # End-to-end tests
├── public/              # Static assets
├── src/
│   ├── assets/          # Application assets (images, etc.)
│   │   ├── components/      # React components
│   │   │   ├── editor/      # Source editor components
│   │   │   ├── export/      # Export functionality
│   │   │   ├── layout/      # Page layout components
│   │   │   ├── results/     # Results display components
│   │   │   └── xpath/       # XPath input and evaluation
│   │   ├── store/           # State management
│   │   ├── types/           # TypeScript type definitions
│   │   ├── utils/           # Utility functions
│   │   │   ├── formatters/  # XML/HTML formatters
│   │   │   └── workers/     # Web workers
│   │   ├── App.tsx          # Main application component
│   │   └── main.tsx         # Application entry point
│   ├── index.html           # HTML entry point
│   ├── package.json         # Frontend dependencies and scripts
│   └── tsconfig.json        # TypeScript configuration
└── vite.config.ts       # Vite configuration
```

### Backend (`/backend`)

```
backend/
├── src/
│   ├── controllers/     # Request handlers
│   ├── routes/          # API route definitions
│   ├── services/        # Business logic
│   ├── workers/         # Long-running tasks
│   └── index.ts         # Entry point
├── package.json         # Backend dependencies and scripts
└── tsconfig.json        # TypeScript configuration
```

## Development Workflow

### Branching Strategy

We follow a standard Git Flow workflow:

- `main`: Production-ready code
- `develop`: Integration branch for feature development
- `feature/*`: Feature branches
- `bugfix/*`: Bug fix branches
- `release/*`: Release preparation branches
- `hotfix/*`: Urgent fixes for production

### Development Process

1. **Create a new branch from `develop`**
   ```bash
   git checkout develop
   git pull
   git checkout -b feature/your-feature-name
   ```

2. **Make changes and commit**
   ```bash
   git add .
   git commit -m "feat: add new feature"
   ```

3. **Push to remote repository**
   ```bash
   git push -u origin feature/your-feature-name
   ```

4. **Create a Pull Request to merge into `develop`**
   - Describe the changes
   - Reference any related issues
   - Request reviews from team members

## Build and Deployment

### Building for Production

1. **Build the Frontend**
   ```bash
   cd frontend
   npm run build
   ```

2. **Build the Backend**
   ```bash
   cd backend
   npm run build
   ```

### Docker Production Deployment

```bash
docker-compose -f docker-compose.prod.yml up -d
```

## Testing

### Frontend Tests

The frontend uses Jest for unit tests and Cypress for end-to-end tests.

**Running Jest Tests**
```bash
cd frontend
npm test
```

**Running Cypress Tests**
```bash
cd frontend
npm run cypress:open  # Interactive mode
npm run cypress:run   # Command line mode
```

### Backend Tests

The backend uses Jest for unit and integration tests.

```bash
cd backend
npm test
```

## Code Style and Standards

### TypeScript and ESLint

We enforce coding standards using ESLint and TypeScript. Configuration is in `.eslintrc.cjs` and `tsconfig.json`.

**Checking Code Style**
```bash
npm run lint
```

### Formatting with Prettier

Code formatting is managed with Prettier, configured in `.prettierrc`.

**Format Code**
```bash
npm run format
```

### Commit Message Format

We follow the Conventional Commits specification:

- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation only changes
- `style`: Changes that do not affect meaning (white-space, formatting, etc)
- `refactor`: A code change that neither fixes a bug nor adds a feature
- `perf`: A code change that improves performance
- `test`: Adding missing tests
- `chore`: Changes to the build process or auxiliary tools

Example:
```
feat: add XPath autocompletion
```

## Common Development Tasks

### Adding a New Component

1. Create a new file in the appropriate directory
2. Define the component with proper TypeScript types
3. Add JSDoc comments for all exported functions and components
4. Import and use the component where needed

### Working with State Management

We use Zustand for state management. Store definitions are in the `src/store` directory.

### Adding an API Endpoint

1. Define the endpoint in `backend/src/routes`
2. Implement the controller in `backend/src/controllers`
3. Add any required service logic in `backend/src/services`

## Troubleshooting

### Common Issues

#### Node.js Version Conflicts

If you encounter Node.js version issues:

```bash
nvm use 20  # If you use nvm
```

#### Port Conflicts

If port 3000 is already in use:

```bash
# In frontend/vite.config.ts
server: {
  port: 3001  # Change to an available port
}
```

#### WebAssembly Formatter Issues

If the WebAssembly formatter isn't working:

1. Check browser console for errors
2. Ensure your browser supports WebAssembly
3. Try using the fallback formatter

### Getting Help

If you need assistance, please:

1. Check existing GitHub issues
2. Create a new issue with detailed information about your problem
3. Reach out to the team on our Discord server 