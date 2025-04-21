import { describe, test, expect, jest } from '@jest/globals';
import { render, screen, fireEvent } from '@testing-library/react';
import ExportDialog from '../ExportDialog';
import { useEditorStore } from '../../../store/editorStore';

// Mock the Zustand store
jest.mock('../../../store/editorStore', () => ({
  useEditorStore: jest.fn()
}));

describe('ExportDialog', () => {
  // Set up basic props
  const mockProps = {
    isOpen: true,
    onClose: jest.fn()
  };

  // Common store setup
  const mockResults = [
    {
      value: '<div>Test Result 1</div>',
      path: '/html/body/div[1]',
      startOffset: 0,
      endOffset: 10
    },
    {
      value: '<span>Test Result 2</span>',
      path: '/html/body/div[2]/span[1]',
      startOffset: 20,
      endOffset: 30
    }
  ];

  // Setup for URL object methods
  const originalCreateObjectURL = URL.createObjectURL;
  const originalRevokeObjectURL = URL.revokeObjectURL;
  
  // Setup for createElementNS and appendChild
  const originalCreateElement = document.createElement;
  const originalAppendChild = document.body.appendChild;
  const originalRemoveChild = document.body.removeChild;
  
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Mock URL methods
    URL.createObjectURL = jest.fn(() => 'mock-url');
    URL.revokeObjectURL = jest.fn();
    
    // Mock DOM methods
    document.createElement = jest.fn(() => ({
      href: '',
      download: '',
      click: jest.fn(),
    })) as unknown as HTMLAnchorElement;
    document.body.appendChild = jest.fn();
    document.body.removeChild = jest.fn();
    
    // Setup store mock with results
    (useEditorStore as jest.Mock).mockImplementation(() => ({
      results: mockResults
    }));
  });
  
  afterEach(() => {
    // Restore original methods
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
    document.createElement = originalCreateElement;
    document.body.appendChild = originalAppendChild;
    document.body.removeChild = originalRemoveChild;
  });

  test('renders the dialog when isOpen is true', () => {
    render(<ExportDialog {...mockProps} />);
    expect(screen.getByText('Export Results')).toBeInTheDocument();
    expect(screen.getByLabelText('File Name')).toBeInTheDocument();
  });

  test('does not render the dialog when isOpen is false', () => {
    render(<ExportDialog {...mockProps} isOpen={false} />);
    expect(screen.queryByText('Export Results')).not.toBeInTheDocument();
  });

  test('closes the dialog when Cancel button is clicked', () => {
    render(<ExportDialog {...mockProps} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(mockProps.onClose).toHaveBeenCalled();
  });

  test('allows changing the file name', () => {
    render(<ExportDialog {...mockProps} />);
    const fileNameInput = screen.getByLabelText('File Name');
    fireEvent.change(fileNameInput, { target: { value: 'custom-file-name' } });
    expect(fileNameInput).toHaveValue('custom-file-name');
  });

  test('allows selecting different export formats', () => {
    render(<ExportDialog {...mockProps} />);
    
    // Initially XML/HTML is selected
    expect(screen.getByLabelText(/XML\/HTML/)).toBeChecked();
    
    // Change to JSON
    fireEvent.click(screen.getByLabelText(/JSON/));
    expect(screen.getByLabelText(/JSON/)).toBeChecked();
    
    // Change to plain text
    fireEvent.click(screen.getByLabelText(/Plain Text/));
    expect(screen.getByLabelText(/Plain Text/)).toBeChecked();
  });

  test('shows the correct result count in XML/HTML option', () => {
    render(<ExportDialog {...mockProps} />);
    expect(screen.getByText(/XML\/HTML \(2 nodes\)/)).toBeInTheDocument();
  });

  test('triggers file download when Export button is clicked', () => {
    render(<ExportDialog {...mockProps} />);
    fireEvent.click(screen.getByText('Export'));
    
    // Check that URL.createObjectURL was called
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    
    // Check that the download link was created and clicked
    expect(document.createElement).toHaveBeenCalledWith('a');
    expect(document.body.appendChild).toHaveBeenCalled();
    
    // Wait for timer to complete
    jest.runAllTimers();
    
    // Check cleanup
    expect(document.body.removeChild).toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalled();
    
    // Check that dialog was closed
    expect(mockProps.onClose).toHaveBeenCalled();
  });
}); 