import { Middleware, RequestHandler } from '../types';
import { ServiceType } from '../constants';
import { HomeHandler } from '../handler/home';
import { ContainerHandler } from '../handler/container';
import { DelegateHandler } from '../handler/delegate';
import { GitPolicyMiddleware } from '../middleware/git-policy';
import { GitHubPolicyMiddleware } from '../middleware/github-policy';
import { DynamicUpstreamMiddleware } from '../middleware/dynamic-upstream';

export type ServiceProfile = {
  handler: RequestHandler,
  middlewares?: ReadonlyArray<Middleware>;
}

export const serviceProfiles: Record<ServiceType, ServiceProfile> = {
  [ServiceType.HOME]: { handler: HomeHandler },
  [ServiceType.DELEGATE]: { handler: DelegateHandler },
  [ServiceType.CONTAINER]: { handler: ContainerHandler },
  [ServiceType.GIT]: { handler: DelegateHandler, middlewares: [GitPolicyMiddleware] },
  [ServiceType.GITHUB]: { handler: DelegateHandler, middlewares: [DynamicUpstreamMiddleware, GitHubPolicyMiddleware] },
  [ServiceType.AI]: { handler: DelegateHandler }
};
