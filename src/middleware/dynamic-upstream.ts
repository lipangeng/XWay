import { AppContext, Middleware, MiddlewareNextFunction } from '../types';
import { isUpstreamAllowed } from '../common/router';

export const DynamicUpstreamMiddleware: Middleware = {
  id: 'DynamicUpstream',
  priority: Number.MIN_SAFE_INTEGER + 1000, // 尽可能高的优先级进行处理
  description: 'Resolves dynamic upstream from URL path based on allowUpstreams list',
  async handle(context: AppContext, next: MiddlewareNextFunction, params?: Record<PropertyKey, any>): Promise<Response> {
    const { route } = context;
    const { config, path } = route;

    // 1. 前置条件：配置了白名单且路径疑似为完整 URL
    const rawPath = path?.replace(/^\/+/, '');

    // 只有配置了 allowUpstreams 的路由才启用此逻辑
    if (config && (rawPath?.startsWith('http://') || rawPath?.startsWith('https://'))) {
      const target = new URL(rawPath);
      if (isUpstreamAllowed([config.upstream, ...params?.allowedUpstreams ?? []], target.hostname)) {
        // 修改当前生效的路由信息
        route.upstream = target.origin;
        route.path = target.pathname;
      } else {
        // 访问白名单之外的地址，进行报错
        return new Response('not allowed upstream: ' + rawPath, { status: 403 });
      }
    }
    return next();
  }
};
