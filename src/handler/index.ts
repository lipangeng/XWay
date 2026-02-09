import { AppContext } from '../types';
import { HomeHandler } from './home';
import { serviceProfiles } from '../config/service';

export async function handleRequest(context: AppContext) {
  let defaultHandler = HomeHandler;
  if (!context.route.config?.type) {
    console.warn(`handler type "${context.route.config?.type}" is missing.`);
    return defaultHandler.handle(context);
  }
  let handler = serviceProfiles[context.route.config?.type]?.handler;
  if (!handler) {
    console.warn(`handler type "${context.route.config?.type}" not found.`);
    handler = defaultHandler;
  }
  return handler.handle(context);
}
