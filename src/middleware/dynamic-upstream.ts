import { AppContext, Middleware, MiddlewareNextFunction } from '../types';
import { isUpstreamAllowed } from '../common/router';

export const DynamicUpstreamMiddleware: Middleware = {
  id: 'DynamicUpstream',
  description: 'Resolves dynamic upstream from URL path based on allowUpstreams list',
  async handle(context: AppContext, next: MiddlewareNextFunction): Promise<Response> {
    const { route } = context;
    const { config, path } = route;

    // 1. 前置条件：配置了白名单且路径疑似为完整 URL
    const rawPath = path?.replace(/^\/+/, '');

    // 只有配置了 allowUpstreams 的路由才启用此逻辑
    if (config?.allowUpstreams?.length && (rawPath?.startsWith('http://') || rawPath?.startsWith('https://'))) {
      const target = new URL(rawPath);
      if (isUpstreamAllowed(config, target.hostname)) {
        // 修改当前生效的路由信息
        route.upstream = target.origin;
        route.path = target.pathname;
      }
    }
    return next();
  }
};
