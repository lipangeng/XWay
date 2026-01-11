/**
 * 服务类型枚举
 * 作用：统一管理后端服务的类型，避免拼写错误
 */
export enum ServiceType {
  CONTAINER = 'Container', // 容器
  GITHUB = 'Github',          // GitHub 主站 (处理重定向)
  HOME = 'Home', // 首页
  // GENERAL = 'general',        // 通用反代
  // DOCKER = 'docker',          // Docker Registry (预留)
  // DELEGATE = 'delegate',       // 委托处理，将请求进行转发
  // UNIVERSAL = 'universal'
}

export enum RouteMatchType {
  FULL_DOMAIN = 'full-domain',
  SUB_DOMAIN = 'sub-domain',
  PATH = 'path',
  CONTAINER_PATH = 'container-path',
  NONE = 'none'
}

export enum RouteMiddlewareMode {
  EXTENDED = 'extended',
  OVERLAY = 'overlay'
}
