import { ServiceType } from '../constants';
import { customHandlers } from '../custom/handler';
import { AppContext, RequestHandler } from '../types';
import { HomeHandler } from './home';
import { ContainerHandler } from './container';
import { DelegateHandler } from './delegate';

// 安全的合并
function safeMerge(...handlers: RequestHandler[]): Record<ServiceType, RequestHandler> {
  let handlerMap: Record<ServiceType, RequestHandler> = {} as Record<ServiceType, RequestHandler>;
  if (handlers) {
    for (const handler of handlers) {
      if (handlerMap[handler.type]) {
        throw new Error(
          `[Config Conflict] 发现重复的RequestHandler配置项: "${handler.type}"。请检查各分类配置，确保 Key 唯一。`
        );
      }
      handlerMap[handler.type] = handler;
    }
  }
  return handlerMap;
}

// 初始化
const coreHandlers: RequestHandler[] = [
  ContainerHandler,
  DelegateHandler
];

export const REGISTERED_HANDLERS: Record<ServiceType, RequestHandler> = safeMerge(...coreHandlers, ...customHandlers);

export async function handleRequest(context: AppContext) {
  let defaultHandler = HomeHandler;
  if (!context.route.config?.type) {
    console.warn(`handler type "${context.route.config?.type}" is missing.`);
    return defaultHandler.handle(context);
  }
  let handler = REGISTERED_HANDLERS[context.route.config?.type];
  if (!handler) {
    console.warn(`handler type "${context.route.config?.type}" not found.`);
    handler = defaultHandler;
  }
  return handler.handle(context);
}
