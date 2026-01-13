import { AppContext, RequestHandler } from '../types';
import { ServiceType } from '../constants';

export const HomeHandler: RequestHandler = {
  type: ServiceType.HOME,
  async handle(ctx: AppContext): Promise<Response> {
    return new Response('XWay 是一款基于 Cloudflare Workers (workerd) 构建的高性能、可插拔、协议感知的资源加速引擎。');
  }
};
