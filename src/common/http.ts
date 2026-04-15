// 返回一个403禁止访问
import { AppContext } from '../types';

// 返回禁止访问页main
export function forbidden(ctx: AppContext | null): Response {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>403 Forbidden - XWay</title>
    <style>
        body { font-family: -apple-system, system-ui, sans-serif; background: #fff; color: #000; margin: 0; display: flex; align-items: center; justify-content: center; height: 100vh; }
        .container { text-align: center; border-left: 2px solid #ed5565; padding: 20px 40px; }
        h1 { margin: 0; font-size: 24px; font-weight: 500; }
        p { color: #666; margin: 10px 0 0; }
        .trace { margin-top: 20px; font-family: monospace; font-size: 12px; color: #999; }
    </style>
</head>
<body>
    <div class="container">
        <h1>403 Forbidden</h1>
        <p>Access denied. This request violates security policies or is not permitted.</p>
        <div class="trace">Trace ID: ${ctx?.params?.trace?.requestId} • XWay </div>
    </div>
</body>
</html>
  `;
  return new Response(html, { status: 403, headers: { 'content-type': 'text/html; charset=utf-8' } });
}

// 构建Url信息
export function buildUrl(options: {
  upstream: string | null | undefined;
  path?: string | null | undefined;
  originUrl?: string | URL;
}): string {
  const { upstream, path, originUrl } = options;

  if (!upstream) throw new Error('upstream is required');

  // 1) upstream 去掉尾部 /
  const base = upstream.replace(/\/+$/, '');

  // 2) path 规范化：空 -> ''；非空确保以 / 开头
  const rawPath = path ?? '';
  const normalizedPath =
    rawPath === '' ? '' : rawPath.startsWith('/') ? rawPath : `/${rawPath}`;

  // 3) search（含 ?）
  let search = '';
  if (originUrl) {
    const u = typeof originUrl === 'string' ? new URL(originUrl) : originUrl;
    search = u.search; // '' or '?a=1'
  }

  return `${base}${normalizedPath}${search}`;
}

/**
 * 获取最优Proto选项，优先使用 X-Forwarded-*
 */
export function getPreferredScheme(request: Request): string {
  const forwardedProto = request.headers.get('x-Forwarded-Proto');
  if (forwardedProto) {
    return forwardedProto.split(',')[0].trim().toLowerCase();
  }
  return new URL(request.url).protocol.replace(':', '').toLowerCase();
}

/**
 * 获取最优Host选项，优先使用 X-Forwarded-*
 */
export function getPreferredHost(request: Request): string {
  const forwardedHost = request.headers.get('x-Forwarded-Host');
  if (forwardedHost) {
    return forwardedHost.split(',')[0].trim();
  }

  const host = request.headers.get('Host');
  if (host) {
    return host;
  }

  return new URL(request.url).hostname;
}

/**
 * 获取最优Port选项，优先使用 X-Forwarded-*
 */
export function getPreferredPort(request: Request): string {
  const forwardedPort = request.headers.get('x-Forwarded-Port');
  if (forwardedPort) {
    return forwardedPort.split(',')[0].trim();
  }

  const url = new URL(request.url);
  if (url.port) {
    return url.port;
  }

  const scheme = getPreferredScheme(request);
  if (scheme === 'https') return '443';
  if (scheme === 'http') return '80';

  return '';
}

/**
 * 获取最优Url选项，优先使用 X-Forwarded-*
 */
export function getPreferredOrigin(request: Request): string {
  const scheme = getPreferredScheme(request);
  const host = getPreferredHost(request);
  const port = getPreferredPort(request);

  if (!port) {
    return `${scheme}://${host}`;
  }

  if ((scheme === 'https' && port === '443') || (scheme === 'http' && port === '80')) {
    return `${scheme}://${host}`;
  }

  return `${scheme}://${host}:${port}`;
}
