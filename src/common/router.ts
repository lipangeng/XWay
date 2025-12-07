import { ParsedRoute, RouteMap } from '../types/router';
import { RouteMatchType } from '../constants';

/**
 * 路由引擎
 */
export function parseRoute(request: Request, routes: RouteMap): ParsedRoute {
	// ---------------------------------------------------------
	// 1. 全域名精确查找 (O(1)) - 优先级最高
	// ---------------------------------------------------------
	const url = new URL(request.url);
	const hostname = url.hostname; // e.g., "api.v1.xway.site"

	if (routes[hostname]) {
		return {
			alias: hostname,
			config: routes[hostname],
			realPath: url.pathname,
			matchType: RouteMatchType.FULL_DOMAIN
		};
	}

	// ---------------------------------------------------------
	// 2. 子域名贪婪匹配 (从后往前扫描) - 优先级次之
	// 逻辑: api.v1.xway.site
	// 第一次检查: api.v1.xway (截取最后一个点之前)
	// 第二次检查: api.v1      (HIT! 立即返回，这就是最长前缀)
	// 第三次检查: api         (不再执行，节省性能)
	// ---------------------------------------------------------

	// 从末尾开始查找 '.'
	let lastDotIndex = hostname.lastIndexOf('.');

	// 循环条件：必须至少保留一个点 (避免匹配顶级域名如 "com", "net")
	// 且 lastDotIndex > 0 避免处理 ".com" 这种异常情况
	while (lastDotIndex > 0) {
		// 截取当前前缀: "api.v1.xway.site" -> "api.v1.xway"
		const currentPrefix = hostname.substring(0, lastDotIndex);

		// O(1) Hash 查找
		if (routes[currentPrefix]) {
			return {
				alias: currentPrefix,
				config: routes[currentPrefix],
				realPath: url.pathname, // 子域名模式下，路径保持原样
				matchType: RouteMatchType.SUB_DOMAIN
			};
		}

		// 指针前移，寻找下一个点
		// "api.v1.xway" -> "api.v1"
		lastDotIndex = hostname.lastIndexOf('.', lastDotIndex - 1);
	}

	// ---------------------------------------------------------
	// 3. 路径前缀匹配 (零内存分配优化) - 优先级最低
	// 逻辑: 仅提取第一个 '/' 和第二个 '/' 之间的内容作为 key
	// ---------------------------------------------------------
	const pathname = url.pathname;
	if (pathname.length > 1) { // 排除根路径 "/"
		// 寻找第二个斜杠的位置: /gh/user/repo -> index of '/' after 0 is 3
		let secondSlashIndex = pathname.indexOf('/', 1);

		let pathPrefix: string;
		if (secondSlashIndex === -1) {
			// 只有一段路径: /gh
			pathPrefix = pathname.substring(1);
		} else {
			// 多段路径: /gh/user/repo
			pathPrefix = pathname.substring(1, secondSlashIndex);
		}

		if (routes[pathPrefix]) {
			return {
				alias: pathPrefix,
				config: routes[pathPrefix],
				// 截取真实路径:
				// /gh -> /
				// /gh/user -> /user
				realPath: secondSlashIndex === -1 ? '/' : pathname.substring(secondSlashIndex),
				matchType: RouteMatchType.PATH
			};
		}
	}

	// ---------------------------------------------------------
	// 4. 无匹配
	// ---------------------------------------------------------
	return {
		alias: null,
		config: null,
		realPath: url.pathname,
		matchType: RouteMatchType.NONE
	};
}
