// 路由配置结构
import { RouteMatchType, RouteMiddlewareMode, ServiceType } from '../constants';

export interface RouteConfig {
	upstream: string;
	type: ServiceType | string;
	description?: string;

	// [Middleware Strategy]
	// extend: 执行 全局默认 + 此处配置 (默认)
	// replace: 仅执行 此处配置 (完全接管)
	middlewareMode?: RouteMiddlewareMode | string;
	middlewares?: string[]; // 中间件 ID 列表

	// [Level 1 Rules]
	rules?: {
		setHeaders?: Record<string, string>;
		removeHeaders?: string[];
		rewrite?: { [pattern: string]: string };
	};
}

export interface ParsedRoute {
	alias: string | null;
	config: RouteConfig | null;
	realPath: string;
	matchType: RouteMatchType;
}

export interface RouteMap {
	[key: string]: RouteConfig;
}
