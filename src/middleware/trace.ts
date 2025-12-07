import { Middleware } from '../types';

export const trace: Middleware = async (context, next) => {
	const start = Date.now();
	const requestId = crypto.randomUUID();

	try {
		const response = await next();
		const duration = Date.now() - start;
		console.log(`[${requestId}] ${context.request.method} ${context.route.realPath} ${response.status} ${duration}ms`);
		const res = new Response(response.body, response);
		res.headers.set('X-Way-Trace', requestId);
		return res;
	} catch (e: any) {
		console.error(`[${requestId}] Error:`, e);
		return new Response(`Internal Error: ${e.message}`, { status: 500 });
	}
};
