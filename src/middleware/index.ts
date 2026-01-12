import { Middleware } from '../types';
import { TraceMiddleware } from './trace';
import { customMiddlewares } from '../custom/middleware';
import { DynamicUpstreamMiddleware } from './dynamic-upstream';

const SYSTEM_MIDDLEWARES: Record<string, Middleware> = {
  [TraceMiddleware.id]: TraceMiddleware,
  [DynamicUpstreamMiddleware.id]: DynamicUpstreamMiddleware
};

const ALL_MIDDLEWARES = { ...SYSTEM_MIDDLEWARES, ...customMiddlewares };

export function getMiddleware(name: string): Middleware | null {
  return ALL_MIDDLEWARES[name] || null;
}
