import { AppContext, Middleware } from '../types';

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

// 监控记录
export interface Trace {
  requestId: string;
  spans: Span[];
  // 辅助方法：快速创建一个 Span 并记录执行过程
  record: <T>(name: string, fn: () => Promise<T>, metadata?: Record<string, any>) => Promise<T>;
}

// 每个监控节点
export interface Span {
  name: string;
  start: number;
  end?: number;
  duration?: number;
  status: 'ok' | 'error';
  metadata?: Record<string, any>;
}
