import { Handler } from '../types';
import { AppContext } from '../app';
import { RouteMatchType } from '../constants';
import { cloneHeaders, HeaderNames } from '../common/fetcher';

/**
 * 容器镜像仓库专用 Handler
 * 兼容 Docker Registry V2 API
 */
export const ContainerHandler: Handler = async (context: AppContext) => {
	const { route } = context;
	const config = route.config!;

	// 直接使用配置的上游地址，不做任何特殊映射
	const upstream = config.upstream;

	// 1. 根据路径分发处理逻辑
	// 如果是认证请求 (/v2/auth)，走专门的认证处理流程
	if (route.realPath === '/v2/auth' || route.realPath.endsWith('/v2/auth')) {
		return handleAuthRequest(context, upstream);
	}

	// 否则走常规镜像请求流程
	return handleRegistryRequest(context, upstream);
};

// =============================================================================
// 子处理流程：常规镜像请求 (Manifests, Blobs)
// =============================================================================

async function handleRegistryRequest(context: AppContext, upstream: string): Promise<Response> {
	const { request, route } = context;
	const config = route.config!;

	// 1. 构造目标 URL
	const targetUrlStr = upstream.replace(/\/+$/, '') + route.realPath + (new URL(request.url).search);

	// 2. 准备请求头
	const newHeaders = cloneHeaders(request.headers!, { remove: [HeaderNames.Host, HeaderNames.Referer] });

	// 应用配置中的 Auth 覆盖 (私有库支持)
	if (config.rules?.setHeaders) {
		Object.entries(config.rules.setHeaders).forEach(([k, v]) => newHeaders.set(k, v));
	}

	// 3. 发起请求
	// redirect: 'follow' -> 自动跟随 Blob 的 S3/CDN 跳转，简化客户端网络需求
	const newReq = new Request(targetUrlStr, {
		method: request.method,
		headers: newHeaders,
		body: request.body,
		redirect: 'manual'
	});

	const response = await fetch(newReq);

	// 处理不同情况下的响应
	// 兼容S3等下载模式
	if (response.status >= 300 && response.status < 400) {
		const location = response.headers.get(HeaderNames.Location);
		if (location) {
			const redirectRequest = new Request(location, {
				method: 'GET',
				redirect: 'flow',
				headers: cloneHeaders(null, {
					set: {
						[HeaderNames.UserAgent]: request.headers.get(HeaderNames.UserAgent)
					}
				})
			});
			return fetch(redirectRequest);
		}
	// 未认证处理
	} else if (response.status === 401 && response.headers.get(HeaderNames.WwwAuthenticate)) {
		return new Response(response.body, {
			status: response.status,
			statusText: response.statusText,
			headers: cloneHeaders(response.headers, { set: { [HeaderNames.WwwAuthenticate]: rewriteWwwAuthenticate(response.headers.get(HeaderNames.WwwAuthenticate) || '', context) } })
		});
	}

	// 正常下载
	return new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers: response.headers
	});
}

// =============================================================================
// 子处理流程：认证请求 (/v2/auth)
// =============================================================================

async function handleAuthRequest(context: AppContext, upstream: string): Promise<Response> {
	const { request } = context;

	// 1. 探测上游真实的认证配置 (Realm & Service)
	// 因为我们拦截了 Realm，现在需要临时去问一下上游："原本你应该去哪认证？"
	const upstreamAuth = await probeUpstreamAuth(context, upstream);

	if (!upstreamAuth || !upstreamAuth.realm) {
		// 如果探测失败，或者上游根本没返回 realm，说明配置有误或上游不支持 Auth
		return new Response('Failed to discover upstream auth realm', { status: 502 });
	}

	// 2. 构造发往真实 Auth Server 的请求
	const targetAuthUrl = new URL(upstreamAuth.realm);
	const clientUrl = new URL(request.url);

	// [参数透传] 直接将客户端请求的所有 query 参数 (scope, client_id, etc.) 复制过去
	clientUrl.searchParams.forEach((value, key) => {
		targetAuthUrl.searchParams.set(key, value);
	});

	// 3. 转发认证请求
	// 客户端发来的 Authorization: Basic <user:pass> 包含在 headers 中，自动透传
	const authReq = new Request(targetAuthUrl.toString(), {
		method: request.method,
		headers: cloneHeaders(request.headers!, { remove: [HeaderNames.Host, HeaderNames.Referer] }),
		redirect: 'follow'
	});

	const response = await fetch(authReq);

	// 4. 返回 Token 给客户端
	return new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers: response.headers
	});
}

// =============================================================================
// 辅助工具方法
// =============================================================================

/**
 * 探测上游的 Auth Realm 和 Service
 * 发起一个匿名请求，触发 401，读取头信息
 */
async function probeUpstreamAuth(context: AppContext, upstream: string): Promise<Record<string, string> | null> {
	try {
		const res = await fetch(`${upstream}/v2/`, {
			method: 'GET',
			headers: cloneHeaders(context.request.headers!, { remove: [HeaderNames.Host, HeaderNames.Referer, HeaderNames.Authorization] }),
			redirect: 'follow'
		});

		if (res.status === 401) {
			const authHeader = res.headers.get('Www-Authenticate');
			if (authHeader) {
				return parseWwwAuthenticate(authHeader);
			}
		}
		// 如果返回 200，说明不需要认证，或者已经认证过了(不太可能)
		return null;
	} catch (e) {
		console.error(`[Container] Auth probe failed for ${upstream}:`, e);
		return null;
	}
}

/**
 * 解析 Www-Authenticate 头
 */
function parseWwwAuthenticate(header: string): Record<string, string> {
	const result: Record<string, string> = {};

	// 匹配 key="value" 格式
	const regex = /([a-z]+)="([^"]+)"/gi;
	let match;
	while ((match = regex.exec(header)) !== null) {
		result[match[1]] = match[2];
	}

	return result;
}

/**
 * 重写 Www-Authenticate 头中的 Realm
 * 只替换 realm="..." 部分，保留 service 和 scope
 */
function rewriteWwwAuthenticate(header: string, context: AppContext): string {
	const { request, route } = context;
	const currentUrl = new URL(request.url);

	// 计算当前代理的 Auth 地址
	let proxyAuthPath = '';
	if (route.matchType === RouteMatchType.FULL_DOMAIN || route.matchType === RouteMatchType.SUB_DOMAIN) {
		proxyAuthPath = `/v2/auth`;
	} else {
		// Path 模式: 需要保留前缀 (如 /docker/v2/auth)
		// route.alias 即为前缀 (e.g., "docker")
		proxyAuthPath = `/${route.alias}/v2/auth`.replace('//', '/');
	}

	const proxyRealm = `${currentUrl.origin}${proxyAuthPath}`;

	// 正则替换: realm="xxx" -> realm="proxyRealm"
	return header.replace(/realm="[^"]+"/, `realm="${proxyRealm}"`);
}
