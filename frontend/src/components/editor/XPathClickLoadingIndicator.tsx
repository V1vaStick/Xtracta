import { useEditorStore } from '../../store/editorStore';

/**
 * Component to display a loading indicator when XPath click processing is active
 */
const XPathClickLoadingIndicator = () => {
  const { isXPathClickProcessing } = useEditorStore();

  if (!isXPathClickProcessing) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-gray-800 text-white py-2 px-4 rounded-md shadow-lg flex items-center gap-2 z-50 animate-fade-in">
      <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
      <span>Generating XPath...</span>
    </div>
  );
};

export default XPathClickLoadingIndicator; 