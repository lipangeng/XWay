import { AppContext, Middleware, MiddlewareNextFunction } from '../types';
import { forbidden } from '../common/http';

type PathPolicyParams = {
  allow?: string[];
  deny?: string[];
  __compiled?: {
    allow: RegExp[];
    deny: RegExp[];
  };
}

export const PathPolicyMiddleware: Middleware<PathPolicyParams> = {
  id: 'PathPolicy',
  priority: 10_000,
  async handle(ctx: AppContext, next: MiddlewareNextFunction, params?: PathPolicyParams): Promise<Response> {
    if (params) {
      const realPath: string = ctx.route?.path ?? new URL(ctx.request.url).pathname;

      // 编译缓存（routes 固定时非常值得）
      if (!params?.__compiled && params) {
        params.__compiled = {
          deny: compile(params?.deny),
          allow: compile(params?.allow)
        };
      }
      const { deny, allow } = params.__compiled!;

      // deny 优先
      if (deny.length > 0 && matchAny(realPath, deny)) {
        return forbidden(ctx);
      }

      // allow：配置了 allow 才生效；必须命中
      if (allow.length > 0 && !matchAny(realPath, allow)) {
        return forbidden(ctx);
      }
    }
    return next();
  }
};

function compile(patterns: string[] | null | undefined): RegExp[] {
  if (!patterns || patterns.length === 0) return [];
  return patterns
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => {
      try {
        return new RegExp(p);
      } catch (e: any) {
        throw new Error(`[PathPolicy] Invalid regex: "${p}" - ${e?.message ?? e}`);
      }
    });
}

function matchAny(path: string, res: RegExp[]): boolean {
  return res.some((re) => re.test(path));
}
