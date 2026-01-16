import { ServiceType } from '../constants';
import { RouteMap } from '../types/router';
import { DynamicUpstreamMiddleware } from '../middleware/dynamic-upstream';
import { GitEnforcerMiddleware } from '../middleware/git-enforcer';

// 容器路由配置
const containerRouter: RouteMap = {
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
const primeContainerRouter: RouteMap = {
  'docker': containerRouter['docker.cr'],
  'quay': containerRouter['quay.cr'],
  'gcr': containerRouter['gcr.cr'],
  'ghcr': containerRouter['ghcr.cr'],
  'k8s': containerRouter['k8s.cr'],
  'mcr': containerRouter['mcr.cr']
};

const gitHubRouter: RouteMap = {
  'github': {
    upstream: 'https://github.com',
    type: ServiceType.DELEGATE,
    middlewares: [
      DynamicUpstreamMiddleware.id,
      GitEnforcerMiddleware.id
    ],
    allowUpstreams: [
      '.github.com',
      '.githubusercontent.com'
    ]
  }
};


/**
 * 安全合并多个路由表
 * 如果发现重复的 Key，直接抛出异常，阻止程序启动/部署
 */
export function safeMerge(...routeMaps: RouteMap[]): RouteMap {
  const result: RouteMap = {};

  for (const map of routeMaps) {
    for (const key in map) {
      // 检查 Key 是否已经存在
      if (Object.prototype.hasOwnProperty.call(result, key)) {
        throw new Error(
          `[Config Conflict] 发现重复的路由配置项: "${key}"。请检查各分类配置，确保 Key 唯一。`
        );
      }
      if (!map[key]) {
        throw new Error(
          `[Config Conflict] 发现空的路由配置项: "${key}"。请检查各分类配置，确保配置不为空。`
        );
      }
      result[key] = map[key];
    }
  }

  return result;
}

export const defaultRoutes: RouteMap = safeMerge(containerRouter, primeContainerRouter, gitHubRouter);
