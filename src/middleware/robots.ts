import { AppContext, Middleware, MiddlewareNextFunction } from '../types';

// 定义 robots.txt 静态内容（可自定义，贴合你的代理场景）
const ROBOTS_CONTENT = `User-agent: *
Disallow: /
# -------------------------------------------------------------------------
# XWay: Distributed Edge Gateway for Global R&D Resource Orchestration
# -------------------------------------------------------------------------
# Purpose:
# 1. Performance benchmarking of edge computing protocols (V8/WASM).
# 2. Global Software Supply Chain synchronization & CI/CD acceleration.
# 3. Secure internal access to distributed R&D assets and cloud-native registries.
#
# Technical Compliance:
# This instance implements strict protocol-level auditing (GitEnforcer/GitHubEnforcer...).
# It is a dedicated node for technical research and internal CI/CD performance testing.
# Unauthorized use or non-R&D activities are restricted by design.
#
# Documentation: https://github.com/lipangeng/XWay
# Technical-Support: lipangeng@outlook.com
# -------------------------------------------------------------------------
`;

export const RobotsMiddleware: Middleware = {
  id: 'Robots',
  priority: Number.MIN_SAFE_INTEGER + 2000,
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
