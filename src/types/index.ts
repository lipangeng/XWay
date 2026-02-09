import { ResolvedRoute, RouteDefinition } from './router';

export interface AppEnv extends Env {
  ROUTE_MODE?: string; // 可选: 'auto' | 'domain' | 'path'
  BASE_DOMAIN?: string; // 本程序的基本域名

  // 允许读取 REMOTE_CONFIG_URL_XX
  [key: string]: string | undefined;
}

// 中间件
export type MiddlewareNextFunction = () => Promise<Response>;

// 中间件配置
export interface Middleware {
  // 唯一标识
  id: string;
  // (可选) 描述信息
  description?: string;
  // (可选) 优先级，数字越小越先执行
  priority?: number;
  // 核心执行的函数
  handle: (ctx: AppContext, next: MiddlewareNextFunction) => Promise<Response>;
}

export interface RequestHandler {
  // (可选) 描述信息
  description?: string;
  // 核心处理逻辑
  handle: (ctx: AppContext) => Promise<Response>;
}

/* 应用配置 */
export interface AppConfig {
  routers: Record<string, RouteDefinition>;
}

/* 应用上下文 */
export interface AppContext {
  request: Request;
  runtime: {
    env: AppEnv;
    ctx: ExecutionContext;
  };
  route: ResolvedRoute;
  middlewares: Middleware[];
  params: Record<string, any>;
}
