import { Middleware } from '../types';
import { trace } from './trace';
import { customMiddlewares } from '../custom/middleware';

const SYSTEM_MIDDLEWARES: Record<string, Middleware> = {
	'sys:timer': trace
};

const ALL_MIDDLEWARES = { ...SYSTEM_MIDDLEWARES, ...customMiddlewares };

export function getMiddleware(name: string): Middleware | null {
	return ALL_MIDDLEWARES[name] || null;
}
