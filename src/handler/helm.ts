// import { Context, Handler } from '../types';
// import { RouteConfig, RouteMap } from '../types/router';
// import { AppContext } from '../app';
//
// // -------------------------------------------------------------
// // 配置常量
// // -------------------------------------------------------------
//
// // 物理缓存 (Cache API 存储时间): 7天
// const PHYSICAL_TTL = 7 * 24 * 60 * 60;
//
// // 1. 软过期 (Soft TTL): 5分钟
// // 超过这个时间，我们认为是"有点旧"，可以在后台悄悄更新
// const SOFT_TTL = 5 * 60 * 1000;
//
// // 2. 硬过期 (Hard TTL): 60分钟
// // 超过这个时间，我们认为是"太旧了"，必须阻塞用户进行检查
// const HARD_TTL = 60 * 60 * 1000;
//
// // 内存防抖记录 (防止软过期时的后台并发风暴)
// const BG_UPDATE_LOCKS: Map<string, number> = new Map();
//
// // -------------------------------------------------------------
// // 核心 Handler
// // -------------------------------------------------------------
// export const helm: Handler = async (context: AppContext) => {
// 	const { request, executionCtx, routes } = context;
// 	const { upstream } = routeConfig;
// 	const targetUrl = upstream + pathStr + (new URL(request.url).search);
//
// 	// 非 index.yaml 直接透传
// 	if (!pathStr.endsWith('index.yaml')) {
// 		const { response, respHeaders } = await proxyRequest(request, targetUrl);
// 		return new Response(response.body, { status: response.status, headers: respHeaders });
// 	}
//
// 	const cache = caches.default;
// 	const cacheKey = new Request(request.url, request);
// 	const currentOrigin = new URL(request.url).origin;
//
// 	// 1. 查询缓存
// 	const cachedResponse = await cache.match(cacheKey);
//
// 	if (cachedResponse) {
// 		const now = Date.now();
// 		const savedAt = parseInt(cachedResponse.headers.get('X-XWay-Saved-At') || '0');
// 		const age = now - savedAt;
//
// 		// =========================================================
// 		// 场景 A: 缓存新鲜 (Fresh)
// 		// =========================================================
// 		if (age < SOFT_TTL) {
// 			const h = new Headers(cachedResponse.headers);
// 			h.set('X-XWay-Cache', 'HIT');
// 			return new Response(cachedResponse.body, { status: 200, headers: h });
// 		}
//
// 		// =========================================================
// 		// 场景 B: 软过期 (Stale but Usable) -> 后台更新
// 		// =========================================================
// 		if (age < HARD_TTL) {
// 			// 检查内存锁，防止并发触发后台任务
// 			const lastLock = BG_UPDATE_LOCKS.get(targetUrl) || 0;
// 			if (now - lastLock > SOFT_TTL) {
// 				console.log(`[Helm] Soft expire (${age}ms), triggering background update...`);
// 				BG_UPDATE_LOCKS.set(targetUrl, now);
//
// 				// Fire-and-Forget
// 				executionCtx.waitUntil(
// 					revalidateLogic(request, targetUrl, cacheKey, routes, currentOrigin, cachedResponse)
// 				);
// 			}
//
// 			const h = new Headers(cachedResponse.headers);
// 			h.set('X-XWay-Cache', 'HIT-STALE'); // 明确告知是旧数据
// 			return new Response(cachedResponse.body, { status: 200, headers: h });
// 		}
//
// 		// =========================================================
// 		// 场景 C: 硬过期 (Too Old) -> 阻塞更新
// 		// =========================================================
// 		console.log(`[Helm] Hard expire (${age}ms), blocking for revalidation...`);
//
// 		// 这里必须 await，不能异步
// 		const freshResponse = await revalidateLogic(
// 			request, targetUrl, cacheKey, routes, currentOrigin, cachedResponse
// 		);
//
// 		if (freshResponse) {
// 			const h = new Headers(freshResponse.headers);
// 			h.set('X-XWay-Cache', 'MISS-REVALIDATED');
// 			return h ? new Response(freshResponse.body, { status: 200, headers: h }) : freshResponse;
// 		}
// 		// 如果更新失败，降级返回旧缓存（总比报错好）
// 		return cachedResponse;
// 	}
//
// 	// 2. 缓存未命中 (首次访问): 同步下载
// 	console.log('[Helm] Cache MISS, fetching synchronously...');
// 	const freshResponse = await fetchAndCacheHelmIndex(
// 		request, targetUrl, cacheKey, routes, currentOrigin
// 	);
//
// 	if (!freshResponse) return new Response('Upstream Error', { status: 502 });
//
// 	const h = new Headers(freshResponse.headers);
// 	h.set('X-XWay-Cache', 'MISS');
// 	return new Response(freshResponse.body, { status: 200, headers: h });
// };
//
// // -------------------------------------------------------------
// // 统一的再验证逻辑 (支持同步调用和异步调用)
// // -------------------------------------------------------------
//
// async function revalidateLogic(
// 	request: Request,
// 	targetUrl: string,
// 	cacheKey: Request,
// 	routes: RouteMap,
// 	currentOrigin: string,
// 	oldCachedResponse: Response
// ): Promise<Response | null> {
// 	try {
// 		// 1. 发起 HEAD 检查 (极速)
// 		const oldEtag = oldCachedResponse.headers.get('X-Upstream-ETag');
// 		const oldLen = oldCachedResponse.headers.get('X-Upstream-Length');
//
// 		const hasChanged = await checkUpstreamChange(targetUrl, oldEtag, oldLen);
//
// 		if (!hasChanged) {
// 			// --- 源站没变 ---
// 			console.log(`[Helm Reval] Unchanged. Renewing timestamp.`);
//
// 			// 复用旧 Body，更新时间戳
// 			const newHeaders = new Headers(oldCachedResponse.headers);
// 			newHeaders.set('X-XWay-Saved-At', Date.now().toString()); // 续命
//
// 			const renewedResponse = new Response(oldCachedResponse.body, {
// 				status: 200, headers: newHeaders
// 			});
//
// 			// 写入 Cache API
// 			// 注意：这里 clone 是因为如果是同步调用，外部还需要读取 body
// 			await caches.default.put(cacheKey, renewedResponse.clone());
// 			return renewedResponse;
// 		}
//
// 		// --- 源站变了 ---
// 		console.log(`[Helm Reval] Changed. Downloading full content...`);
// 		return await fetchAndCacheHelmIndex(request, targetUrl, cacheKey, routes, currentOrigin);
//
// 	} catch (e) {
// 		console.error('[Helm Reval] Failed', e);
// 		return null;
// 	}
// }
//
// // ----------------------------------------------------------------------
// // 辅助函数 (保持不变)
// // ----------------------------------------------------------------------
//
// async function checkUpstreamChange(url: string, oldEtag: string | null, oldLen: string | null): Promise<boolean> {
// 	try {
// 		const res = await fetch(url, {
// 			method: 'HEAD',
// 			headers: { 'User-Agent': 'XWay-Helm' },
// 			cf: { cacheTtl: 0 }
// 		});
// 		if (!res.ok) return true;
//
// 		const newEtag = res.headers.get('ETag');
// 		const newLen = res.headers.get('Content-Length');
//
// 		// 严谨判断：只要有指纹且不一致，就是变了
// 		if (newEtag && oldEtag && newEtag !== oldEtag) return true;
// 		if (newLen && oldLen && newLen !== oldLen) return true;
//
// 		// 如果源站没有任何指纹头，为了安全起见，认为变了
// 		if (!newEtag && !newLen) return true;
//
// 		return false;
// 	} catch {
// 		return true;
// 	}
// }
//
// async function fetchAndCacheHelmIndex(
// 	request: Request,
// 	targetUrl: string,
// 	cacheKey: Request,
// 	routes: RouteMap,
// 	currentOrigin: string
// ): Promise<Response | null> {
// 	const { response, respHeaders } = await proxyRequest(request, targetUrl);
// 	if (!response.ok) return null;
//
// 	const yamlContent = await response.text();
//
// 	// YAML 替换逻辑 (复用之前的 Context-Aware Regex)
// 	// 假设该函数已定义在当前文件或导入
// 	const processedYaml = processYamlSafe(yamlContent, routes, currentOrigin);
//
// 	respHeaders.delete('Content-Length');
// 	if (!respHeaders.get('Content-Type')?.includes('yaml')) {
// 		respHeaders.set('Content-Type', 'text/yaml; charset=utf-8');
// 	}
//
// 	// 物理缓存 7 天
// 	respHeaders.set('Cache-Control', `public, max-age=${PHYSICAL_TTL}, s-maxage=${PHYSICAL_TTL}`);
//
// 	// 记录关键元数据
// 	respHeaders.set('X-XWay-Saved-At', Date.now().toString());
//
// 	const etag = response.headers.get('ETag');
// 	const len = response.headers.get('Content-Length');
// 	if (etag) respHeaders.set('X-Upstream-ETag', etag);
// 	if (len) respHeaders.set('X-Upstream-Length', len);
//
// 	const finalResponse = new Response(processedYaml, {
// 		status: response.status, headers: respHeaders
// 	});
//
// 	await caches.default.put(cacheKey, finalResponse.clone());
//
// 	return finalResponse;
// }
//
// // 占位函数：请确保包含 processYamlSafe, findProxyPrefix, replaceUrl 的实现
// function processYamlSafe(c: string, r: RouteMap, o: string) {
// 	return c;
// }
