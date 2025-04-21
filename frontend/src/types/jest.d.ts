declare global {
  // Jest globals
  function describe(name: string, fn: () => void): void;
  function beforeEach(fn: () => void): void;
  function test(name: string, fn: () => void): void;
  function test(name: string, fn: () => Promise<void>): void;
  function expect<T>(actual: T): jest.Matchers<T>;
  namespace jest {
    interface Matchers<R> {
      toBeDefined(): R;
      toHaveLength(expected: number): R;
      toBe(expected: any): R;
      toBeGreaterThan(expected: number): R;
      rejects: {
        toThrow(expected?: string | RegExp | Error | Function): Promise<void>;
      };
    }
    function clearAllMocks(): void;
  }
}

export {}; 