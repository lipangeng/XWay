import { ServiceType } from '../constants';
import { RouteDefinition } from '../types/router';
import { DynamicUpstreamMiddleware } from '../middleware/dynamic-upstream';
import { safeAssign } from '../common/common';
import { GitHubPolicyMiddleware } from '../middleware/github-policy';
import { PathPolicyMiddleware } from '../middleware/path-policy';

// 容器路由配置
const containerRouter: Record<string, RouteDefinition> = {
  'docker.cr': {
    upstream: 'https://registry-1.docker.io',
    type: ServiceType.CONTAINER
  },
  'quay.cr': {
    upstream: 'https://quay.io',
    type: ServiceType.CONTAINER
  },
  'gcr.cr': {
    upstream: 'https://gcr.io',
    type: ServiceType.CONTAINER
  },
  'ghcr.cr': {
    upstream: 'https://ghcr.io',
    type: ServiceType.CONTAINER
  },
  'k8s.cr': {
    upstream: 'https://registry.k8s.io',
    type: ServiceType.CONTAINER
  },
  'mcr.cr': {
    upstream: 'https://mcr.microsoft.com',
    type: ServiceType.CONTAINER
  },
  'ecr.cr': {
    upstream: 'https://public.ecr.aws',
    type: ServiceType.CONTAINER
  },
  'gitlab.cr': {
    upstream: 'https://registry.gitlab.com',
    type: ServiceType.CONTAINER
  },
  'redhat.cr': {
    upstream: 'https://registry.redhat.io',
    type: ServiceType.CONTAINER
  },
  'oracle.cr': {
    upstream: 'https://container-registry.oracle.com',
    type: ServiceType.CONTAINER
  },
  'codeberg.cr': {
    upstream: 'https://codeberg.org',
    type: ServiceType.CONTAINER
  },
  'forgejo.cr': {
    upstream: 'https://code.forgejo.org',
    type: ServiceType.CONTAINER
  },
  'cloudsmith.cr': {
    upstream: 'https://docker.cloudsmith.io',
    type: ServiceType.CONTAINER
  },
  'digitalocean.cr': {
    upstream: 'https://registry.digitalocean.com',
    type: ServiceType.CONTAINER
  },
  'vmware.cr': {
    upstream: 'https://projects.registry.vmware.com',
    type: ServiceType.CONTAINER
  },
  'heroku.cr': {
    upstream: 'https://registry.heroku.com',
    type: ServiceType.CONTAINER
  },
  'suse.cr': {
    upstream: 'https://registry.suse.com',
    type: ServiceType.CONTAINER
  },
  'opensuse.cr': {
    upstream: 'https://registry.opensuse.org',
    type: ServiceType.CONTAINER
  },
  'gitpod.cr': {
    upstream: 'https://registry.gitpod.io',
    type: ServiceType.CONTAINER
  }
};

// 主要映射配置,用来简化访问路径
const primeContainerRouter: Record<string, RouteDefinition> = {
  'docker': containerRouter['docker.cr'],
  'quay': containerRouter['quay.cr'],
  'gcr': containerRouter['gcr.cr'],
  'ghcr': containerRouter['ghcr.cr'],
  'k8s': containerRouter['k8s.cr'],
  'mcr': containerRouter['mcr.cr']
};

const gitHubRouter: Record<string, RouteDefinition> = {
  'github': {
    upstream: 'https://github.com',
    type: ServiceType.DELEGATE,
    middlewares: [
      {
        middleware: DynamicUpstreamMiddleware,
        params: {
          allowedUpstreams: [
            '.github.com',
            '.githubusercontent.com'
          ]
        }
      },
      GitHubPolicyMiddleware
    ]
  }
};

const aiRouter: Record<string, RouteDefinition> = {
  'openai.ai': {
    upstream: 'https://api.openai.com',
    type: ServiceType.AI,
    middlewares: [
      {
        middleware: PathPolicyMiddleware,
        params: {
          allow: ['^/v1/']
        }
      }
    ]
  }
};

// 主要映射配置,用来简化访问路径
const primeAIRouter: Record<string, RouteDefinition> = {
  'openai': aiRouter['openai.ai']
};

/**
 * 安全合并多个路由表
 * 如果发现重复的 Key，直接抛出异常，阻止程序启动/部署
 */
export const defaultRoutes = safeAssign(
  {},
  [containerRouter, primeContainerRouter, gitHubRouter, aiRouter, primeAIRouter]
) as Record<string, RouteDefinition>;
