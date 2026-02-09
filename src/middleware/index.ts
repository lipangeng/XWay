import { Middleware, MiddlewareRef } from '../types';

export function isMiddleware(x: MiddlewareRef): x is Middleware {
  return typeof x === 'object' && x !== null && 'handle' in x && 'id' in x;
}
