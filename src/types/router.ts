// 路由配置结构
import { RouteMatchType, RouteMiddlewareMode, ServiceType } from '../constants';
import { Middleware } from './index';

export interface RouteDefinition {
  upstream: string;
  type: ServiceType;
  description?: string;

  // [Renamed] 动态上游白名单
  // 允许客户端通过路径 (e.g. /raw.githubusercontent.com/...) 动态指定上游
  // 只有在此列表中的域名才会被允许作为 Upstream，防止 SSRF。
  allowUpstreams?: string[];

  // [Middleware Strategy]
  // extend: 执行 全局默认 + 此处配置 (默认)
  // replace: 仅执行 此处配置 (完全接管)
  middlewareMode?: RouteMiddlewareMode | string;
  middlewares?: Middleware[]; // 中间件 ID 列表

  // [Level 1 Rules]
  rules?: {
    setHeaders?: Record<string, string>;
    removeHeaders?: string[];
    rewrite?: { [pattern: string]: string };
  };
}

export interface ResolvedRoute {
  // [重命名] alias -> key
  // 对应配置文件中的键名 (e.g. "docker", "docker.cr", "gh")
  key?: string;
  path?: string;
  upstream?: string;
  config?: Readonly<RouteDefinition>;
  matchType: Readonly<RouteMatchType>;
  // 原始路由快照
  // 记录路由引擎刚解析完成时的状态，不受后续中间件修改的影响
  // 它是只读的，无需配置，自动生成
  readonly raw?: Readonly<ResolvedRoute> | null;
}
