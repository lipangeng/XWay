// 返回一个403禁止访问
import { AppContext } from '../types';

// 返回禁止访问页main
export function Forbidden(ctx: AppContext | null): Response {
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
