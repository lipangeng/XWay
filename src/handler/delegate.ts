import { RequestHandler, AppContext } from '../types';
import { ServiceType } from '../constants';
import { applyHeaderRules, applyRewriteRules, cloneHeaders, HeaderNames } from '../common/fetcher';
import { buildUrl } from '../common/http';

export const DelegateHandler: RequestHandler = {
  description: 'Container request handler',
  handle(ctx: AppContext): Promise<Response> {
    const { request, route } = ctx;
    const config = route.config!;

    // 执行路径重写 (Rewrite)
    // 注意：此处操作的是 route.path，可能是被中间件修改过的，也可能是原始的
    let proxyUrl = applyRewriteRules(config, buildUrl({ upstream: route.upstream, path: route.path, originUrl: request.url }));

    // 准备请求头
    let proxyHeaders = applyHeaderRules(config, cloneHeaders(request.headers, { remove: [HeaderNames.Host, HeaderNames.Referer] }));

    // 构建请求对象
    const proxyRequest = new Request(proxyUrl, {
      method: request.method,
      headers: proxyHeaders,
      body: request.body,
      // 通用模式默认跟随跳转，除非有特殊协议需求
      redirect: 'follow'
    });

    // 实际进行请求
    return fetch(proxyRequest);
  }
};
