import { ServiceType } from '../constants';
import { customHandlers } from '../custom/handler';
import { AppContext } from '../app';
import { Handler } from '../types';
import { HomeHandler } from './home';

const CORE_HANDLERS: Record<ServiceType, Handler> = {};

const ALL_HANDLERS: Record<ServiceType, Handler> = {
	...CORE_HANDLERS,
	...customHandlers
};

export async function doHandler(context: AppContext) {
	let defaultHandler = HomeHandler;
	if (!context.route.config?.type) {
		console.warn(`handler type "${context.route.config?.type}" is missing.`);
		return defaultHandler(context);
	}
	let handler = ALL_HANDLERS[context.route.config?.type as ServiceType];
	if (!handler) {
		console.warn(`handler type "${context.route.config?.type}" not found.`);
		handler = defaultHandler;
	}
	return handler(context);
}
