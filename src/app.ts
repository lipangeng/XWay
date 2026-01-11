import { loadConfig } from './config/loader';
import { parseRoute } from './common/router';
import { ParsedRoute, RouteMap } from './types/router';
import { Middleware } from './types';
import { getMiddleware } from './middleware';
import { RouteMatchType, RouteMiddlewareMode } from './constants';
import { doHandler } from './handler';
import { Env } from './types';
import { HomeHandler } from './handler/home';
import { TraceMiddleware } from './middleware/trace';

/* 应用配置 */
export interface AppConfig {
  router: RouteMap;
}

/* 应用上下文 */
export interface AppContext {
  request: Request;
  runtime: {
    env: Env;
    ctx: ExecutionContext;
  };
  route: ParsedRoute;
  middlewares: Middleware[];
}

export class XWayApp {
  private defaultMiddlewares: Middleware[] = [];
  private config: AppConfig | undefined;

  useMiddlewares(middlewares: Middleware[]) {
    this.defaultMiddlewares = middlewares;
    return this;
  }

  /* 加载配置文件 */
  async load(env: Env) {
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
  async dispatch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // 1. 处理路由
    let route: ParsedRoute = parseRoute(request, <RouteMap>this.config?.router);

    // 2. 构建中间件链 (Strategy Pattern)
    const middlewares: Middleware[] = [];
    const routeConfig = route.config;

    if (routeConfig) {
      if (routeConfig.middlewareMode === RouteMiddlewareMode.OVERLAY) {
        // Replace 模式: 仅使用配置的中间件
        if (routeConfig.middlewares) {
          for (let middlewareId of routeConfig.middlewares) {
            const mw = getMiddleware(middlewareId);
            if (mw) middlewares.push(mw);
            else console.warn(`[XWay] Middleware "${middlewareId}" not found`);
          }
        }
      } else {
        // Extend 模式 (默认): 默认 + 配置
        middlewares.push(...this.defaultMiddlewares);
        if (routeConfig.middlewares) {
          for (let middlewareId of routeConfig.middlewares) {
            const mw = getMiddleware(middlewareId);
            if (mw) middlewares.push(mw);
            else console.warn(`[XWay] Middleware "${middlewareId}" not found`);
          }
        }
      }
    } else {
      middlewares.push(...this.defaultMiddlewares);
    }

    // 构建上下文
    const context: AppContext = {
      request,
      runtime: {
        env: env,
        ctx: ctx
      },
      route: route,
      middlewares: middlewares
    };
    return doDispatch(context, 0);
  }
}

async function doDispatch(context: AppContext, middlewareIdx: number): Promise<Response> {
  // 链条结束，进入 Handler
  if (middlewareIdx === context.middlewares.length) {
    if (context.route.matchType !== RouteMatchType.NONE) {
      return await doHandler(context);
    }
    return HomeHandler.handle(context);
  }
  return context.middlewares[middlewareIdx]?.handle(context, () => doDispatch(context, middlewareIdx + 1));
}



