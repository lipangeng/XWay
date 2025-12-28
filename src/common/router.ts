import { ParsedRoute, RouteMap } from '../types/router';
import { RouteMatchType, ServiceType } from '../constants';

/**
 * 路由引擎
 */
export function parseRoute(request: Request, routes: RouteMap): ParsedRoute {
	// ---------------------------------------------------------
	// 1. 全域名精确查找 (O(1)) - 优先级最高
	// ---------------------------------------------------------
	const url = new URL(request.url);
	const hostname = url.hostname; // e.g., "api.v1.xway.site"
	const accept = request.headers.get('Accept')?.toLowerCase() || '';

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

	// Docker 特殊路径匹配
	if (pathname.startsWith('/v2') && isDockerRequest(request)) {
		// 路径结构: /v2/ALIAS/rest...
		const secondSlash = pathname.indexOf('/', 1);
		if (secondSlash !== -1) {
			const thirdSlash = pathname.indexOf('/', secondSlash + 1);
			const potentialAlias = thirdSlash === -1 ? pathname.substring(secondSlash + 1) : pathname.substring(secondSlash + 1, thirdSlash);
			const config = routes[potentialAlias];
			// 只有当该路由确实存在，且类型为 DOCKER 时才触发此逻辑
			// 防止误伤正常的 /v2/ 路径
			if (config && config.type === ServiceType.CONTAINER) {
				return {
					alias: potentialAlias,
					config: config,
					// 重组路径：移除 /ALIAS
					// 原: /v2/docker/library/nginx/...
					// 新: /v2/library/nginx/...
					// 方法: 也就是把 parts[2] 删掉，重新 join
					realPath: '/v2' + (thirdSlash === -1 ? '/' : pathname.substring(thirdSlash)),
					matchType: RouteMatchType.CONTAINER_PATH
				};
			}
		}
	}

	// 常规配置匹配
	if (pathname.length > 1) { // 排除根路径 "/"
		// 路径结构: /v2/ALIAS/rest...
		const secondSlash = pathname.indexOf('/', 1);
		let potentialAlias: string;
		if (secondSlash === -1) {
			// 只有一段路径: /gh
			potentialAlias = pathname.substring(1);
		} else {
			// 多段路径: /gh/user/repo
			potentialAlias = pathname.substring(1, secondSlash);
		}
		const config = routes[potentialAlias];
		if (config) {
			return {
				alias: potentialAlias,
				config: config,
				// 截取真实路径:
				// /gh -> /
				// /gh/user -> /user
				realPath: secondSlash === -1 ? '/' : pathname.substring(secondSlash),
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

// 判断是否Docker请求，仅Path模式下使用
function isDockerRequest(request: Request): boolean {
	const headers = request.headers;
	const ua = headers.get('User-Agent')?.toLowerCase() || '';
	const accept = headers.get('Accept')?.toLowerCase() || '';
	// 1. 协议特征检测 (最准确)
	if (accept.includes('vnd.docker') || accept.includes('vnd.oci')) {
		return true;
	}
	// 2. 客户端特征检测
	// 用于覆盖 docker login / 握手 等不带特殊 Accept 的场景
	const knownClients = [
		'docker/',      // Docker CLI
		'containerd/',  // Kubernetes / Containerd
		'kaniko/',      // CI/CD 构建工具
		'podman/',      // RedHat Podman
		'crio/',
		'cri-o/',       // K8s Runtime
		'buildkit/',    // Docker Buildx
		'skopeo/'       // 镜像搬运工具
	];

	if (knownClients.some(client => ua.includes(client))) {
		return true;
	}
	return false;
}
