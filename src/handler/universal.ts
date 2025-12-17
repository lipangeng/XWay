import { Handler } from '../types';

export const UniversalHandler: Handler = async (ctx) => {
	const { request, route } = ctx;
	const { upstream, rules } = route.config!; // 此时肯定有 config

	// 1. 路径重写 (Rewrite)
	let targetPath = route.realPath;
	if (rules?.rewrite) {
		for (const [pattern, replacement] of Object.entries(rules.rewrite)) {
			targetPath = targetPath.replace(new RegExp(pattern), replacement);
		}
	}

	// 2. 构造目标 URL
	const targetUrl = new URL(upstream + targetPath + (new URL(request.url).search));

	// 3. 处理 Headers
	const newHeaders = new Headers(request.headers);

	// [关键] 必须修正 Host，否则源站会拒绝
	newHeaders.set('Host', targetUrl.hostname);

	// 应用自定义规则
	if (rules?.setHeaders) {
		Object.entries(rules.setHeaders).forEach(([k, v]) => newHeaders.set(k, v));
	}
	if (rules?.removeHeaders) {
		rules.removeHeaders.forEach(k => newHeaders.delete(k));
	}

	// 默认策略：Referer 指向源站 (防止防盗链拦截)
	if (!newHeaders.has('Referer')) {
		newHeaders.set('Referer', upstream);
	}

	// 4. 发起请求
	// 使用 manual 模式，以便上层逻辑(如有)能感知重定向，或者直接透传 3xx
	const newReq = new Request(targetUrl.toString(), {
		method: request.method,
		headers: newHeaders,
		body: request.body,
		redirect: 'manual'
	});

	const response = await fetch(newReq);

	// 5. 返回结果 (复制 headers 以便修改)
	const respHeaders = new Headers(response.headers);

	return new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers: respHeaders
	});
};
