# Contributing to Xtracta

Thank you for your interest in contributing to Xtracta! This guide outlines the process for contributing to the project and helps you get started.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
- [Development Setup](#development-setup)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Community](#community)

## Code of Conduct

By participating in this project, you are expected to uphold our Code of Conduct:

- Use welcoming and inclusive language
- Be respectful of differing viewpoints and experiences
- Gracefully accept constructive criticism
- Focus on what is best for the community
- Show empathy towards other community members

## How Can I Contribute?

### Reporting Bugs

This section guides you through submitting a bug report. Following these guidelines helps maintainers understand your report, reproduce the behavior, and find related reports.

**Before Submitting A Bug Report:**
- Check the [existing issues](https://github.com/mnhlt/Xtracta/issues) to see if the problem has already been reported.
- If you're unable to find an open issue addressing the problem, open a new one.

**How Do I Submit A Good Bug Report?**
- **Use a clear and descriptive title** for the issue to identify the problem.
- **Describe the exact steps which reproduce the problem** in as many details as possible.
- **Provide specific examples** to demonstrate the steps.
- **Describe the behavior you observed after following the steps** and point out what exactly is the problem with that behavior.
- **Explain which behavior you expected to see instead and why.**
- **Include screenshots or animated GIFs** if possible.
- **If the problem is related to performance or memory**, include a performance profile capture if possible.
- **If the problem is related to the XPath engine**, include the XML/HTML content and the XPath expression.

### Suggesting Enhancements

This section guides you through submitting an enhancement suggestion, including completely new features and minor improvements to existing functionality.

**Before Submitting An Enhancement Suggestion:**
- Check if the enhancement has already been suggested in the issues.
- Determine which repository the enhancement should be suggested in.

**How Do I Submit A Good Enhancement Suggestion?**
- **Use a clear and descriptive title** for the issue.
- **Provide a step-by-step description of the suggested enhancement** in as many details as possible.
- **Provide specific examples to demonstrate the steps**. Include copy/pasteable snippets as Markdown code blocks.
- **Describe the current behavior** and **explain which behavior you expected to see instead** and why.
- **Include screenshots or animated GIFs** if possible.
- **Explain why this enhancement would be useful** to most Xtracta users.
- **List some other applications where this enhancement exists**, if applicable.

### Your First Code Contribution

Unsure where to begin contributing to Xtracta? You can start by looking through these `beginner` and `help-wanted` issues:

- [Beginner issues](https://github.com/mnhlt/Xtracta/labels/beginner) - issues which should only require a few lines of code.
- [Help wanted issues](https://github.com/mnhlt/Xtracta/labels/help%20wanted) - issues which should be a bit more involved than beginner issues.

### Pull Requests

- Fill in the required template
- Follow the style guides
- Document new code
- End all files with a newline
- Update the README.md with details of changes to the interface

## Development Setup

For detailed information about setting up the development environment, please see [DEVELOPMENT.md](DEVELOPMENT.md).

Quick setup:

1. **Fork the repository**

2. **Clone your fork**
   ```bash
   git clone https://github.com/YOUR-USERNAME/xtracta.git
   cd xtracta
   ```

3. **Install dependencies**
   ```bash
   cd frontend
   npm install

   cd ../backend
   npm install
   ```

4. **Create a branch for your feature**
   ```bash
   git checkout -b feature/my-new-feature
   ```

5. **Make your changes**

6. **Run tests to ensure everything works**
   ```bash
   npm test
   ```

7. **Push to your fork and submit a pull request**

## Pull Request Process

1. **Update the documentation** with details of changes you made.
2. **Add tests** for any new features you've added.
3. **Ensure all tests pass** before submitting your pull request.
4. **Update the CHANGELOG.md** with details of changes to the interface.
5. **Increase the version numbers** in any examples files and the README.md to the new version that your Pull Request would represent.
6. **Address review comments**: Your pull request will be reviewed by maintainers, who might suggest changes.
7. **Once you have the sign-off of two maintainers**, your pull request will be merged.

## Coding Standards

### TypeScript

- Use TypeScript for all new code
- Define proper interfaces and types
- Use ESM imports/exports

### React Components

- Use functional components with hooks
- Add JSDoc comments to all components and functions
- Follow component organization (one component per file)
- Use proper prop typing

### CSS/Styling

- Use Tailwind CSS for styling
- Follow the existing color scheme and design patterns
- Ensure all UI elements are accessible

### Tests

- Write unit tests for new functionality
- Ensure all tests pass before submitting PR
- Include e2e tests for new features when appropriate

### Commit Messages

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification for commit messages:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

Types:
- **feat**: A new feature
- **fix**: A bug fix
- **docs**: Documentation only changes
- **style**: Changes that do not affect the meaning of the code
- **refactor**: A code change that neither fixes a bug nor adds a feature
- **perf**: A code change that improves performance
- **test**: Adding missing tests or correcting existing tests
- **build**: Changes that affect the build system or external dependencies
- **ci**: Changes to our CI configuration files and scripts
- **chore**: Other changes that don't modify src or test files

Example:
```
feat(xpath): add support for XPath 3.1 functions

Implemented additional XPath 3.1 functions for improved compatibility.
Includes array functions and map functions.

Closes #123
```

## Community

### Discord

Join our [Discord server](https://discord.gg/xtracta) to chat with other contributors and users.

### Weekly Meetings

We hold weekly contributor meetings on Zoom every Friday at 3:00 PM UTC. Join us to discuss ongoing development and planning.

### Mentoring

We have a mentoring program for new contributors. If you're interested, please email mentoring@xtracta.dev for more information.

---

Thank you for contributing to Xtracta! Your efforts help make this project better for everyone. 