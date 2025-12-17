/**
 * 服务类型枚举
 * 作用：统一管理后端服务的类型，避免拼写错误
 */
export enum ServiceType {
	CONTAINER = 'container', // 容器
	// GITHUB = 'github',          // GitHub 主站 (处理重定向)
	// GITHUB_RAW = 'github_raw',  // GitHub Raw/Assets
	// GENERAL = 'general',        // 通用反代
	// DOCKER = 'docker',          // Docker Registry (预留)
	// DELEGATE = 'delegate',       // 委托处理，将请求进行转发
	// UNIVERSAL = 'universal'
}

export enum RouteMatchType {
	FULL_DOMAIN = 'full-domain',
	SUB_DOMAIN = 'sub-domain',
	PATH = 'path',
	NONE = 'none'
}

export enum RouteMiddlewareMode {
	EXTENDED = 'extended',
	OVERLAY = 'overlay'
}
