/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Bind resources to your worker in `wrangler.jsonc`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */
import { XWayApp } from './app';
import { Env } from './types';
import { TraceMiddleware } from './middleware/trace';
import { RobotsMiddleware } from './middleware/robots';

// 初始化应用并设置默认中间件
export const app = new XWayApp();
app.useMiddlewares([TraceMiddleware, RobotsMiddleware]);

export default {
  async fetch(request, env: Env, ctx): Promise<Response> {

    // 首次启动时加载配置文件
    // 由于是冷启动，可能速度会较慢
    if (!app.getConfig()) {
      await app.load(env);
    } else {
      ctx.waitUntil(app.load(env));
    }

    // 启动应用
    return app.dispatch(request, env, ctx);
  }
} satisfies ExportedHandler<Env>;
