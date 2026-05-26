import { createContext, useContext, Provider } from 'react';

/**
 * Creates a React context and a hook that enforces usage within a provider.
 */
export function createSafeContext<T>(contextName: string) {
  const context = createContext<T | undefined>(undefined);

  function useSafeContext(): T {
    const value = useContext(context);
    if (value === undefined) {
      throw new Error(`use${contextName} must be used within a ${contextName}Provider`);
    }
    return value;
  }

  return [useSafeContext, context.Provider] as const;
}
