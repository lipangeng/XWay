import { ServiceType } from '../constants';
import { RouteMap } from '../types/router';

// 容器路由配置
const containerRoute: RouteMap = {
  'docker': {
    upstream: 'https://registry-1.docker.io',
    type: ServiceType.CONTAINER
  },
  'quay': {
    upstream: 'https://quay.io',
    type: ServiceType.CONTAINER
  },
  'gcr': {
    upstream: 'https://gcr.io',
    type: ServiceType.CONTAINER
  },
  'ghcr': {
    upstream: 'https://ghcr.io',
    type: ServiceType.CONTAINER
  },
  'k8s': {
    upstream: 'https://registry.k8s.io',
    type: ServiceType.CONTAINER
  },
  'mcr': {
    upstream: 'https://mcr.microsoft.com',
    type: ServiceType.CONTAINER
  },
  'ecr': {
    upstream: 'https://public.ecr.aws',
    type: ServiceType.CONTAINER
  },
  'gitlab': {
    upstream: 'https://registry.gitlab.com',
    type: ServiceType.CONTAINER
  },
  'redhat': {
    upstream: 'https://registry.redhat.io',
    type: ServiceType.CONTAINER
  },
  'oracle': {
    upstream: 'https://container-registry.oracle.com',
    type: ServiceType.CONTAINER
  },
  'cloudsmith': {
    upstream: 'https://docker.cloudsmith.io',
    type: ServiceType.CONTAINER
  },
  'digitalocean': {
    upstream: 'https://registry.digitalocean.com',
    type: ServiceType.CONTAINER
  },
  'vmware': {
    upstream: 'https://projects.registry.vmware.com',
    type: ServiceType.CONTAINER
  },
  'heroku': {
    upstream: 'https://registry.heroku.com',
    type: ServiceType.CONTAINER
  },
  'suse': {
    upstream: 'https://registry.suse.com',
    type: ServiceType.CONTAINER
  },
  'opensuse': {
    upstream: 'https://registry.opensuse.org',
    type: ServiceType.CONTAINER
  },
  'gitpod': {
    upstream: 'https://registry.gitpod.io',
    type: ServiceType.CONTAINER
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
      result[key] = map[key];
    }
  }

  return result;
}

export const defaultRoutes: RouteMap = safeMerge(containerRoute);
