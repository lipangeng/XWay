import { loadConfig } from './config/loader';
import { parseRoute } from './common/router';
import { ResolvedRoute } from './types/router';
import { AppConfig, AppContext, AppEnv, Middleware, MiddlewareRef } from './types';
import { RouteMatchType, RouteMiddlewareMode } from './constants';
import { handleRequest } from './handler';
import { HomeHandler } from './handler/home';
import { serviceProfiles } from './config/service';
import { isMiddleware } from './middleware';


export class XWayApp {
  private defaultMiddlewares: MiddlewareRef[] = [];
  private config: AppConfig | undefined;

  useMiddlewares(middlewares: Middleware[]) {
    this.defaultMiddlewares = middlewares;
    return this;
  }

  /* 加载配置文件 */
  async load(env: AppEnv) {
    let loaded = loadConfig(env);
    if (loaded) {
      this.config = loaded;
    }
  }

  /* 获取配置 */
  getConfig(): AppConfig | undefined {
    return this.config;
  }

  /*
  进行请求处理
  */
  async dispatch(request: Request, env: AppEnv, ctx: ExecutionContext): Promise<Response> {
    // 1. 处理路由
    let route: ResolvedRoute = parseRoute(request, this.config?.routers);

    // 2. 构建中间件链 (Strategy Pattern)
    const middlewares: MiddlewareRef[] = [];
    const routeConfig = route.config;

    if (routeConfig) {
      if (routeConfig.middlewareMode === RouteMiddlewareMode.OVERLAY) {
        // Replace 模式: 仅使用配置的中间件
        if (routeConfig.middlewares) {
          for (let middleware of routeConfig.middlewares) {
            if (middleware) middlewares.push(middleware);
            else console.warn(`Found ${middleware} middleware`);
          }
        }
      } else {
        // Extend 模式 (默认): 默认 + 配置
        middlewares.push(...this.defaultMiddlewares);
        // 注入ServiceType对应的默认中间件配置
        let serviceType = routeConfig.type;
        if (serviceType) {
          let serviceProfile = serviceProfiles[serviceType];
          if (serviceProfile && serviceProfile.middlewares) {
            middlewares.push(...serviceProfile.middlewares);
          }
        }
        // 注入手动配置的中间件
        if (routeConfig.middlewares) {
          for (let middleware of routeConfig.middlewares) {
            if (middleware) middlewares.push(middleware);
            else console.warn(`Found ${middleware} middleware`);
          }
        }
      }
    } else {
      middlewares.push(...this.defaultMiddlewares);
    }
    // 中间件优先级排序，从小到大排序
    middlewares.map((mr: MiddlewareRef) => isMiddleware(mr) ? { middleware: mr } : mr)
      .sort((a: { middleware: Middleware, params?: Record<PropertyKey, any> }, b: { middleware: Middleware, params?: Record<PropertyKey, any> }) => {
        return (a.middleware.priority ?? 0) - (b.middleware.priority ?? 0);
      });

    // 中间件优先级排序，从小到大排序
    middlewares.sort((a: MiddlewareRef, b: MiddlewareRef) => {
      return ((isMiddleware(a) ? a.priority : a.middleware.priority) ?? 0) - ((isMiddleware(b) ? b.priority : b.middleware.priority) ?? 0);
    });

    // 构建上下文
    const context: AppContext = {
      request,
      runtime: {
        env: env,
        ctx: ctx
      },
      route: route,
      middlewares: middlewares,
      params: []
    };
    return invokeMiddleware(context, 0);
  }
}

// 链式调用中间件配置
function invokeMiddleware(context: AppContext, index: number): Promise<Response> {
  // 检查是否到达链条末端
  if (index >= context.middlewares.length) {
    // 如果未匹配到任何节点
    if (context.route.matchType === RouteMatchType.NONE) {
      return HomeHandler.handle(context);
    }
    return handleRequest(context);
  }
  // 链式调用中间件
  let middleware = context.middlewares[index];
  return isMiddleware(middleware) ?
    middleware.handle(context, () => invokeMiddleware(context, index + 1)) :
    middleware.middleware!.handle(context, () => invokeMiddleware(context, index + 1), middleware.params);
}
