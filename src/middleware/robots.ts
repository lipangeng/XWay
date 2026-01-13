import { AppContext, Middleware, MiddlewareNextFunction } from '../types';
import { isUpstreamAllowed } from '../common/router';

// 定义 robots.txt 静态内容（可自定义，贴合你的代理场景）
const ROBOTS_CONTENT = `User-agent: *
Disallow: /
Comment: This is a open-source proxy (XWay), no phishing behavior.
Source: https://github.com/lipangeng/XWay
Contact: lipangeng@outlook.com
`;

export const RobotsMiddleware: Middleware = {
  id: 'Robots',
  priority: Number.MAX_SAFE_INTEGER,
  description: 'robots.txt',
  async handle(context: AppContext, next: MiddlewareNextFunction): Promise<Response> {
    const { route } = context;
    const { path } = route;

    if (path?.toLowerCase() === '/robots.txt') {
      // 返回 robots.txt 响应，无需执行后续中间件/路由
      return new Response(ROBOTS_CONTENT, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'public, max-age=86400',
          'X-Robots-Tag': 'noindex, nofollow'
        }
      });
    }

    return next();
  }
};
