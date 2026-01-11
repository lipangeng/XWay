import { RequestHandler } from '../types';
import { ServiceType } from '../constants';
import { AppContext } from '../app';

export const HomeHandler: RequestHandler = {
  type: ServiceType.HOME,
  async handle(ctx: AppContext): Promise<Response> {
    return new Response('Hello World');
  }
};
