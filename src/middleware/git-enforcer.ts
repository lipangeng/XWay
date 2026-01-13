import { AppContext, Middleware } from '../types';
import { isGitAction, isGitClient, isGitResource, isLfsAction } from '../common/protocols/git';
import { Forbidden } from '../common/http';

export const GitEnforcerMiddleware: Middleware = {
  id: 'GitEnforcer',
  priority: 1000,
  description: 'Request trace',
  // 处理内容
  async handle(ctx: AppContext, next: () => Promise<Response>): Promise<Response> {
    const { request, route } = ctx;
    const { path, upstream } = route;
    // 进行检查，只放行特定的请求
    if (!isGitClient(request, path) && !isGitAction(request, path) && !isLfsAction(request, path) && !isGitResource(request, path)) {
      return Forbidden(ctx);
    }
    return next();
  }
};
