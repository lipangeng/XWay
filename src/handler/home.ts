import { AppContext, RequestHandler } from '../types';
import { ServiceType } from '../constants';

export const HomeHandler: RequestHandler = {
  type: ServiceType.HOME,
  async handle(ctx: AppContext): Promise<Response> {
    const html = `
      <!DOCTYPE html>
      <html lang="zh-CN">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>XWay | Edge Gateway Node</title>
          <style>
              body { font-family: "SF Mono", Monaco, Consolas, monospace; line-height: 1.5; color: #24292e; max-width: 900px; margin: 60px auto; padding: 0 30px; background-color: #f6f8fa; }
              .container { background: #fff; border: 1px solid #d1d5da; border-radius: 6px; padding: 32px; box-shadow: 0 1px 3px rgba(27,31,35,0.12); }
              h1 { font-size: 24px; border-bottom: 1px solid #eaecef; padding-bottom: 0.3em; color: #0366d6; }
              .status-bar { display: flex; gap: 10px; margin-bottom: 20px; }
              .badge { background: #28a745; color: #fff; padding: 3px 10px; border-radius: 12px; font-size: 12px; font-weight: 600; }
              .badge-gray { background: #6a737d; }
              li { margin-bottom: 8px; }
              .warning { background: #fffbdd; border: 1px solid #d1d5da; padding: 15px; border-radius: 6px; font-size: 0.9em; margin-top: 30px; }
              footer { margin-top: 40px; font-size: 12px; color: #6a737d; text-align: center; }
          </style>
      </head>
      <body>
          <div class="container">
              <h1>XWay Edge Runtime Instance</h1>
              <div class="status-bar">
                  <span class="badge">Node Status: Active</span>
                  <span class="badge badge-gray">Version: 1.0.0-stable</span>
              </div>

              <p>本项目为基于边缘计算架构（Edge Computing）的<strong>分布式资源编排引擎</strong>，专门用于优化复杂网络环境下的研发资源调度效率。</p>

              <h3>核心技术特征</h3>
              <ul>
                  <li><strong>协议深度指纹识别：</strong> 仅转发符合 OCI Distribution 与 Git 传输标准的研发请求。</li>
                  <li><strong>无状态路由矩阵：</strong> 基于全球 Anycast 网络的研发资源寻址与负载均衡。</li>
                  <li><strong>供应链隔离审计：</strong> 内置中间件强制拦截非研发性质的流量，保障节点合规性。</li>
              </ul>

              <div class="warning">
                  <strong>免责声明 (Disclaimer):</strong> 本页面仅用于技术架构展示。该节点由系统自动部署，不提供任何形式的商业服务或技术支持。所有访问日志均受协议审计逻辑实时监控。
              </div>
          </div>
          <footer>
              © 2026 XWay Research Project. All rights reserved.
          </footer>
      </body>
      </html>
    `;

    return new Response(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'X-Frame-Options': 'DENY',
        'X-Content-Type-Options': 'nosniff',
        'Permissions-Policy': 'interest-cohort=()' // 拒绝 FLoC 追踪
      }
    });
  }
};
