interface CacheEntry {
	content: string;       // 文件内容 (文本)
	etag: string | null;   // 源站 ETag
	lastModified: string | null;
	updatedAt: number;     // 本地更新时间戳
}

export interface FetchResult {
	content: string;       // 文件内容
	isNew: boolean;        // true=新下载的; false=使用了缓存
	error?: string;        // 如果发生错误
	updatedAt: number;     // 本地更新时间戳
}

const FILE_CACHE = new Map<string, CacheEntry>();
const PENDING_REQUESTS = new Map<string, Promise<FetchResult>>();

/**
 * 获取远程文件
 * 特性：请求合并 + 严格指纹校验 + 无指纹不缓存
 */
export async function fetchTextWithCache(
	url: string,
	forceRefresh = false
): Promise<FetchResult> {

	// 请求合并锁
	if (PENDING_REQUESTS.has(url)) {
		return PENDING_REQUESTS.get(url)!;
	}

	const task = _executeFetch(url, forceRefresh);
	PENDING_REQUESTS.set(url, task);

	try {
		return await task;
	} finally {
		PENDING_REQUESTS.delete(url);
	}
}

/* 实际获取逻辑 */
async function _executeFetch(url: string, forceRefresh: boolean): Promise<FetchResult> {
	const cached = FILE_CACHE.get(url);

	// === 分支 1: 尝试利用缓存 (HEAD 预检) ===
	if (cached && !forceRefresh) {
		try {
			const headRes = await fetch(url, {
				method: 'HEAD',
				headers: { 'User-Agent': 'XWay-Fetcher' },
				cf: { cacheTtl: 0 } // 强制回源
			});

			if (headRes.ok) {
				const newEtag = headRes.headers.get('ETag');
				const newMod = headRes.headers.get('Last-Modified');

				// 执行严格对比
				if (compareFingerprintStrict(cached, newEtag, newMod)) {
					// 校验通过：确实没变
					// console.log(`[SmartFetch] Cache HIT: ${url}`);
					return { content: cached.content, isNew: false, updatedAt: cached.updatedAt };
				}
			}
		} catch (e) {
			// 网络波动导致 HEAD 失败，降级使用旧缓存
			console.warn(`[SmartFetch] HEAD check failed: ${url}`);
			return { content: cached.content, isNew: false, updatedAt: cached.updatedAt };
		}
	}

	// === 分支 2: 全量下载 ===
	try {
		const res = await fetch(url, {
			headers: { 'User-Agent': 'XWay-Fetcher' },
			cf: { cacheTtl: 0 }
		});

		if (!res.ok) {
			throw new Error(`Fetch failed: ${res.status}`);
		}

		const text = await res.text();
		const etag = res.headers.get('ETag');
		const lastModified = res.headers.get('Last-Modified');

		// [规则] 无指纹不缓存
		// 如果源站不支持协商缓存，我们在内存里存了也没用，下次还得下载，不如不存节省内存
		if (!etag && !lastModified) {
			return { content: text, isNew: true, updatedAt: Date.now() };
		}

		// 更新缓存
		let cached: CacheEntry = {
			content: text,
			etag,
			lastModified,
			updatedAt: Date.now()
		};
		FILE_CACHE.set(url, cached);

		return { content: cached.content, isNew: true, updatedAt: cached.updatedAt };

	} catch (e: any) {
		console.error(`[Fetcher] Error: ${e.message}`);
		// 最后防线
		if (cached) {
			return { content: cached.content, isNew: false, error: e.message, updatedAt: Date.now() };
		}
		throw e;
	}
}

/**
 * 严格指纹对比 (Strict Intersection)
 * 逻辑：
 * 1. 如果源站返回了 ETag，必须和缓存一致。
 * 2. 如果源站返回了 Last-Modified，必须和缓存一致。
 * 3. 必须至少有一个校验项被执行了，否则视为不可验证（变了）。
 *
 * 返回 true 表示"没变"，false 表示"变了"
 */
function compareFingerprintStrict(
	cached: CacheEntry,
	newEtag: string | null,
	newModified: string | null
): boolean {
	let hasChecked = false;

	// 1. 校验 ETag
	if (newEtag) {
		// 如果源站有 ETag，但缓存没有，或者不一致 -> 变了
		if (!cached.etag || cached.etag !== newEtag) {
			return false;
		}
		hasChecked = true;
	}

	// 2. 校验 Last-Modified
	if (newModified) {
		// 如果源站有 LM，但缓存没有，或者不一致 -> 变了
		if (!cached.lastModified || cached.lastModified !== newModified) {
			return false;
		}
		hasChecked = true;
	}

	// 3. 兜底防御
	// 如果 newEtag 和 newMod 都为空（源站这次啥也没发），我们无法确认文件状态
	// 为了安全，视为"变了"（重新下载 body 确认）
	if (!hasChecked) {
		return false;
	}

	// 所有存在的检查项都通过了
	return true;
}
