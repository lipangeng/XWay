import { Middleware } from '../types';
import { TraceMiddleware } from './trace';
import { customMiddlewares } from '../custom/middleware';
import { DynamicUpstreamMiddleware } from './dynamic-upstream';
import { RobotsMiddleware } from './robots';
import { GitEnforcerMiddleware } from './git-enforcer';

const SYSTEM_MIDDLEWARES: Record<string, Middleware> = {
  [TraceMiddleware.id]: TraceMiddleware,
  [DynamicUpstreamMiddleware.id]: DynamicUpstreamMiddleware,
  [RobotsMiddleware.id]: RobotsMiddleware,
  [GitEnforcerMiddleware.id]: GitEnforcerMiddleware
};

const ALL_MIDDLEWARES = { ...SYSTEM_MIDDLEWARES, ...customMiddlewares };

export function getMiddleware(name: string): Middleware | null {
  return ALL_MIDDLEWARES[name] || null;
}
