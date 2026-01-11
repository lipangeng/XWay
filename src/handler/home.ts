import { AppContext, RequestHandler } from '../types';
import { ServiceType } from '../constants';

export const HomeHandler: RequestHandler = {
  type: ServiceType.HOME,
  async handle(ctx: AppContext): Promise<Response> {
    return new Response('Hello World');
  }
};
