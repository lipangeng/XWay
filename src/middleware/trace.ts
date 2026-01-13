import { AppContext, Middleware } from '../types';

export const TraceMiddleware: Middleware = {
  id: 'Trace',
  priority: Number.MIN_SAFE_INTEGER,
  description: 'Request trace',
  // 处理内容
  async handle(ctx: AppContext, next: () => Promise<Response>): Promise<Response> {
    const { request } = ctx;
    const requestId = request.headers.get('cf-ray') || crypto.randomUUID().split('-')[0];
    const trace = createTrace(requestId);
    ctx.params.trace = trace;
    // 记录一些基础元数据，方便回溯
    if (requestId) trace.spans.push({ name: 'cf_metadata', start: Date.now(), status: 'ok', metadata: { ray: request.headers.get('cf-ray') } });

    try {
      const response: Response = await trace.run('', next);
      const res = new Response(response.body, response);
      res.headers.set('X-Way-Trace', JSON.stringify(trace));
      return res;
    } catch (e: any) {
      console.error(`[Trace][${requestId}] Pipeline Crash:`, e);
      return new Response(`[XWay] Internal Error. Trace: ${requestId}`, { status: 500 });
    } finally {
      // 无论如何也打印链路数据
      ctx.runtime.ctx.waitUntil((async () => {
        logTraceSummary(ctx);
      })());
    }
  }
};

// 监控记录
export interface Trace {
  requestId: string;
  spans: Span[];
  // 辅助方法：快速创建一个 Span 并记录执行过程
  run: <T>(name: string, fn: () => Promise<T>, metadata?: Record<string, any>) => Promise<T>;
  // 手动模式：手动控制开启和关闭
  start: (name: string, metadata?: Record<string, any>) => ActiveSpan;
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

export interface ActiveSpan {
  span: Span;
  /**
   * 结束当前 Span
   * @param status 状态，默认为 ok
   * @param metadata 结束时补充的元数据
   */
  end: (status?: 'ok' | 'error', metadata?: Record<string, any>) => void;
}

function createTrace(requestId: string): Trace {
  const spans: Span[] = [];
  return {
    requestId,
    spans,
    start(name: string, metadata?: Record<string, any>): ActiveSpan {
      const span: Span = {
        name,
        start: Date.now(),
        status: 'ok',
        metadata: metadata || {}
      };
      spans.push(span);

      return {
        span,
        end(status: 'ok' | 'error' = 'ok', extraMeta?: Record<string, any>) {
          span.end = Date.now();
          span.duration = span.end - span.start;
          span.status = status;
          if (extraMeta) {
            span.metadata = { ...span.metadata, ...extraMeta };
          }
        }
      };
    },
    run<T>(name: string, fn: () => Promise<T>, metadata?: Record<string, any>): Promise<T> {
      const span: Span = {
        name,
        start: Date.now(),
        status: 'ok',
        metadata: metadata || {}
      };
      spans.push(span);

      try {
        return fn();
      } catch (e: any) {
        span.status = 'error';
        span.metadata = { ...span.metadata, error: e.message };
        throw e; // 继续抛出以便中间件捕获
      } finally {
        span.end = Date.now();
        span.duration = span.end - span.start;
      }
    }
  };
}

/**
 * 辅助：在控制台打印漂亮的链路汇总
 */
function logTraceSummary(ctx: AppContext) {
  const trace: Trace = ctx.params.trace;
  if (!trace) return;

  const total = trace.spans.find(s => s.name === 'total_lifecycle');
  console.log(`\n[Trace][${trace.requestId}] ${ctx.request.method} ${ctx.route.path} | Total: ${total?.duration||'Unknown'} ms`);

  trace.spans.forEach(span => {
    const icon = span.status === 'ok' ? '✅' : '❌';
    const meta = Object.keys(span.metadata || {}).length > 0
      ? ` | meta: ${JSON.stringify(span.metadata)}`
      : '';
    console.log(`  ${icon} [${span.name.padEnd(15)}] ${span.duration||'Unknown'} ms${meta}`);
  });
}
