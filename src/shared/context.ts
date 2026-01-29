import { AsyncLocalStorage } from 'async_hooks';

interface Context {
  requestId?: string;
  [key: string]: any;
}

const asyncLocalStorage = new AsyncLocalStorage<Context>();

export function runWithContext<T>(context: Context, callback: () => T): T {
  return asyncLocalStorage.run(context, callback);
}

export function getContext(): Context | undefined {
  return asyncLocalStorage.getStore();
}

export function getRequestId(): string | undefined {
  const context = getContext();
  return context?.requestId;
}
