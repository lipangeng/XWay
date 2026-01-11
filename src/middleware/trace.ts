import { Middleware } from '../types';
import { AppContext } from '../app';

export const TraceMiddleware: Middleware = {
  id: 'trace',
  // 处理内容
  async handle(ctx: AppContext, next: () => Promise<Response>): Promise<Response> {
    const start = Date.now();
    const requestId = crypto.randomUUID();
    try {
      const response = await next();
      const duration = Date.now() - start;
      console.log(`[${requestId}] ${ctx.request.method} ${ctx.route.path} ${response.status} ${duration}ms`);
      const res = new Response(response.body, response);
      res.headers.set('X-Way-Trace', requestId);
      return res;
    } catch (e: any) {
      console.error(`[${requestId}] Error:`, e);
      return new Response(`[XWay]Internal Error: ${e.message}`, { status: 500 });
    }
  }
};
