# Xtracta Components

This directory contains the React components that make up the Xtracta XPath playground application.

## Structure

The components are organized into the following subdirectories:

- `editor/`: Components related to the source editor and editing experience
- `export/`: Components for exporting and downloading XPath results
- `layout/`: Components for the overall application layout
- `results/`: Components for displaying XPath evaluation results
- `xpath/`: Components for XPath query input and evaluation

## Key Components

### Editor Components

- **SourceEditor**: Main editor component for XML/HTML content using Monaco Editor.
- **HoverToXPathProvider**: Adds hover-to-XPath functionality to the source editor.

### Export Components

- **ExportDialog**: Modal dialog for exporting XPath results in different formats (XML/HTML, JSON, plain text).

### Layout Components

- **Header**: Application header with logo, title, and main navigation.
- **Footer**: Application footer with links and information.
- **MainLayout**: The main application layout that arranges all components.
- **SplitPane**: Resizable split pane used to divide the editor and results areas.

### Results Components

- **ResultsPanel**: Displays the results of XPath evaluations, including counts and execution time.
- **ResultItem**: Individual result item displaying node value and path.
- **ResultsNavigation**: Controls for navigating through results.

### XPath Components

- **XPathInput**: Input field for entering and evaluating XPath expressions.
- **XPathHistory**: Dropdown showing previously executed XPath queries.
- **XPathFunctions**: Reference panel showing available XPath functions and axes.

## Component Guidelines

When adding new components to the Xtracta application, please follow these guidelines:

1. **TypeScript**: All components should be written in TypeScript with proper type definitions.
2. **JSDoc/TSDoc**: Add comprehensive documentation to each component.
3. **Styling**: Use Tailwind CSS for styling, following the existing patterns.
4. **State Management**: Use the Zustand store for global state.
5. **Testing**: Write unit tests for each component using Jest and React Testing Library.

## Example Usage

Here's an example of how the main components are composed in the application:

```tsx
// Example of main application layout
<MainLayout>
  <Header />
  <SplitPane>
    <SourceEditor />
    <div className="flex flex-col">
      <XPathInput />
      <ResultsPanel />
    </div>
  </SplitPane>
  <Footer />
</MainLayout>
``` 