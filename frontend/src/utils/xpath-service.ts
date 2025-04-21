/**
 * Creates and manages the XPath WebWorker
 */

interface XPathResult {
  matches: Array<{
    value: string;
    path: string;
    startOffset?: number;
    endOffset?: number;
  }>;
  count: number;
  executionTime: number;
}

let worker: Worker | null = null;

/**
 * Evaluate an XPath expression against XML/HTML content
 */
export const evaluateXPath = (
  content: string,
  xpathExpression: string,
  isHtml: boolean = false
): Promise<XPathResult> => {
  return new Promise((resolve, reject) => {
    try {
      // Check content size to decide between local evaluation and API
      const contentSizeInMB = new Blob([content]).size / (1024 * 1024);

      if (contentSizeInMB > 5) {
        // For large content, use the backend API
        evaluateWithAPI(content, xpathExpression, isHtml)
          .then(resolve)
          .catch(reject);
      } else {
        // For smaller content, use WebWorker
        evaluateWithWorker(content, xpathExpression, isHtml)
          .then(resolve)
          .catch(reject);
      }
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Evaluate XPath using WebWorker
 */
const evaluateWithWorker = (
  content: string,
  xpathExpression: string,
  isHtml: boolean
): Promise<XPathResult> => {
  return new Promise((resolve, reject) => {
    try {
      // Initialize worker if not already created
      if (!worker) {
        // In a real implementation, we would use a proper worker build process
        // For simplicity in this demo, we're creating a mock worker
        const mockWorker = {
          postMessage: (message: any) => {
            // Mock worker message processing
            setTimeout(() => {
              // Mock evaluation result
              const startPos = content.indexOf('<div');
              const endPos = content.indexOf('</div>') + 6;
              
              const mockResult = {
                type: 'result',
                matches: [
                  {
                    value: content.substring(startPos, endPos),
                    path: '/html/body/div[1]',
                    startOffset: startPos,
                    endOffset: endPos
                  }
                ],
                count: 1,
                executionTime: 42
              };
              
              // Dispatch mock message event
              const mockEvent = new MessageEvent('message', {
                data: mockResult
              });
              
              if (mockWorker.onmessage) {
                mockWorker.onmessage(mockEvent);
              }
            }, 200);
          },
          onmessage: null as ((event: MessageEvent) => void) | null,
          terminate: () => {}
        };
        
        worker = mockWorker as unknown as Worker;
      }

      // Set up message handler
      worker.onmessage = (event: MessageEvent) => {
        const response = event.data;

        if (response.type === 'result') {
          resolve({
            matches: response.matches,
            count: response.count,
            executionTime: response.executionTime
          });
        } else if (response.type === 'error') {
          reject(new Error(response.error));
        }
      };

      // Handle worker errors
      worker.onerror = (error) => {
        reject(new Error(`Worker error: ${error.message}`));
      };

      // Send message to worker
      worker.postMessage({
        type: 'evaluate',
        content,
        xpathExpression,
        isHtml
      });
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Evaluate XPath using backend API
 */
const evaluateWithAPI = async (
  content: string,
  xpathExpression: string,
  isHtml: boolean
): Promise<XPathResult> => {
  try {
    const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/xpath/evaluate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content,
        xpath: xpathExpression,
        isHtml,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Error evaluating XPath expression');
    }

    const data = await response.json();
    return {
      matches: data.matches,
      count: data.count,
      executionTime: data.executionTime,
    };
  } catch (error: any) {
    throw new Error(`API error: ${error.message}`);
  }
}; 