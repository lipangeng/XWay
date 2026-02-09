import { ResolvedRoute, RouteDefinition } from '../types/router';
import { RouteMatchType, ServiceType } from '../constants';
import { isContainerRequest } from './protocols/container';

/**
 * 路由引擎
 */
export function parseRoute(request: Request, routes: Record<string, RouteDefinition> | null | undefined): ResolvedRoute {
  // 前置入参校验（防空）
  if (!request || !routes || typeof routes !== 'object') {
    return {
      path: '/',
      matchType: RouteMatchType.NONE
    };
  }

  const url = new URL(request.url);
  const { pathname } = url;

  // 1. 全域名及子域名匹配 (域名层级的逻辑最直接，优先处理)
  const domainMatch = matchDomain(url, request, routes);
  if (domainMatch) return domainMatch;

  if (pathname.length <= 1) return { path: pathname, matchType: RouteMatchType.NONE };

  const dockerMatch = matchDockerV2Path(url, request, routes);
  if (dockerMatch) return dockerMatch;

  const genericPathMatch = matchGenericPath(url, request, routes);
  if (genericPathMatch) return genericPathMatch;

  return {
    path: url.pathname,
    matchType: RouteMatchType.NONE
  };
}

// =============================================================================
// 域名匹配逻辑 (O(1) 贪婪搜索)
// =============================================================================
function matchDomain(url: URL, request: Request, routes: Record<string, RouteDefinition>): ResolvedRoute | null {
  // 提取hostname
  const hostname = url.hostname;
  if (!hostname) return null;
  // 全域名匹配
  if (routes[hostname]) {
    return { key: hostname, config: routes[hostname], path: url.pathname, upstream: routes[hostname]?.upstream, matchType: RouteMatchType.FULL_DOMAIN };
  }

  // 子域名从长到短匹配 (api.v1.docker.cr.rarely.pro -> docker.cr)
  let lastDotIndex = hostname.lastIndexOf('.');
  while (lastDotIndex > 0) {
    const currentPrefix = hostname.substring(0, lastDotIndex);
    if (routes[currentPrefix]) {
      return {
        key: currentPrefix,
        config: routes[currentPrefix],
        path: url.pathname,
        upstream: routes[currentPrefix]?.upstream,
        matchType: RouteMatchType.SUB_DOMAIN
      };
    }
    lastDotIndex = hostname.lastIndexOf('.', lastDotIndex - 1);
  }
  return null;
}

// =============================================================================
// Docker /v2/ 特殊路径 匹配处理
// =============================================================================
function matchDockerV2Path(url: URL, request: Request, routes: Record<string, RouteDefinition>): ResolvedRoute | null {
  const pathname = url.pathname;

  // 前置检查：必须是 /v2/ 开头且符合容器客户端特征
  if (!pathname.startsWith('/v2/') || !isContainerRequest(request)) return null;

  // 直接匹配 即 /v2/docker.cr/ 模式匹配
  let directSegmentIndex = pathname.indexOf('/', 4);
  const directSegment = directSegmentIndex === -1 ? pathname.substring(4) : pathname.substring(4, directSegmentIndex);
  if (directSegment && routes[directSegment] && routes[directSegment].type === ServiceType.CONTAINER) {
    return {
      key: directSegment,
      config: routes[directSegment],
      path: '/v2' + (directSegmentIndex === -1 ? '/' : pathname.substring(directSegmentIndex)),
      upstream: routes[directSegment]?.upstream,
      matchType: RouteMatchType.CONTAINER_PATH
    };
  }

  // 路径反转 docker.cr -> /cr/docker, 进行贪婪匹配，从后向前，最长匹配16个 /
  let fullSegment = getPathSegments(pathname, 4, 16);
  const totalSegments = fullSegment.segments.length;
  let reversedSegments = [...fullSegment.segments].reverse();

  // 贪婪搜索：从最长组合开始 (i 代表匹配的段数)
  // 我们至少需要匹配 2 层 (因为 1 层已经被上面的直连匹配处理了)
  for (let i = totalSegments; i >= 2; i--) {
    // 计算在 reversedSegments 中的起始偏移量
    // 比如总长 3，匹配 3 层(i=3)，offset = 0 (取全部)
    // 比如总长 3，匹配 2 层(i=2)，offset = 1 (取后两个: docker, cr)
    const offset = totalSegments - i;

    // 利用 slice 提取后缀并拼接
    const routeKey = reversedSegments.slice(offset).join('.');

    const config = routes[routeKey];
    if (config && config.type === ServiceType.CONTAINER) {
      // indices 对应的索引是 i-1
      const matchEndIndex = fullSegment.indices[i - 1];

      return {
        key: routeKey,
        config: config,
        path: '/v2' + (matchEndIndex === -1 ? '/' : pathname.substring(matchEndIndex)),
        upstream: config.upstream,
        matchType: RouteMatchType.CONTAINER_PATH
      };
    }
  }

  return null;
}

// =============================================================================
// 通用路径匹配逻辑
// =============================================================================
function matchGenericPath(url: URL, request: Request, routes: Record<string, RouteDefinition>): ResolvedRoute | null {
  const pathname = url.pathname;

  // 直接匹配 即 /docker.cr/ 模式匹配
  let directSegmentIndex = pathname.indexOf('/', 1);
  const directSegment = directSegmentIndex === -1 ? pathname.substring(1) : pathname.substring(1, directSegmentIndex);
  if (directSegment && routes[directSegment]) {
    return {
      key: directSegment,
      config: routes[directSegment],
      path: directSegmentIndex === -1 ? '/' : pathname.substring(directSegmentIndex),
      upstream: routes[directSegment].upstream,
      matchType: RouteMatchType.PATH
    };
  }

  // 路径反转 docker.cr -> /cr/docker, 进行贪婪匹配，从后向前，最长匹配16个 /
  let fullSegment = getPathSegments(pathname, 1, 16);
  const totalSegments = fullSegment.segments.length;
  let reversedSegments = [...fullSegment.segments].reverse();

  // 贪婪搜索：从最长组合开始 (i 代表匹配的段数)
  // 我们至少需要匹配 2 层 (因为 1 层已经被上面的直连匹配处理了)
  for (let i = totalSegments; i >= 2; i--) {
    // 计算在 reversedSegments 中的起始偏移量
    // 比如总长 3，匹配 3 层(i=3)，offset = 0 (取全部)
    // 比如总长 3，匹配 2 层(i=2)，offset = 1 (取后两个: docker, cr)
    const offset = totalSegments - i;

    // 利用 slice 提取后缀并拼接
    const routeKey = reversedSegments.slice(offset).join('.');

    const config = routes[routeKey];
    if (config) {
      // indices 对应的索引是 i-1
      const matchEndIndex = fullSegment.indices[i - 1];

      return {
        key: routeKey,
        config: config,
        path: matchEndIndex === -1 ? '/' : pathname.substring(matchEndIndex),
        upstream: config.upstream,
        matchType: RouteMatchType.PATH
      };
    }
  }
  return null;
}


// =============================================================================
// 工具函数
// =============================================================================
// 路径段提取器，使用游标方式提取指定深度的路径段，避免全量split
function getPathSegments(pathname: string, start: number, depth: number): { segments: string[], indices: number[] } {
  const segments: string[] = [];
  const indices: number[] = [];

  let currentPos = start;
  // 容错：如果 start 刚好是 /，跳过
  if (pathname[currentPos] === '/') currentPos++;


  for (let i = 0; i < depth; i++) {
    const nextSlash = pathname.indexOf('/', currentPos);
    if (nextSlash === -1) {
      // 最后一个段
      const seg = pathname.substring(currentPos);
      if (seg) {
        segments.push(seg);
        indices.push(-1); // -1 表示字符串末尾
      }
      break;
    }
    const seg = pathname.substring(currentPos, nextSlash);
    if (seg && seg !== '/') {
      segments.push(seg);
      indices.push(nextSlash);
    }
    currentPos = nextSlash + 1;
  }

  return { segments, indices };
}

// 判断是否允许的上游地址
export function isUpstreamAllowed(allowedUpstreams: Array<string>, upstream: string) {

  // 统一转为小写，域名不区分大小写
  const target = upstream.toLowerCase();

  return (allowedUpstreams ?? []).some(rule => {
    const cleanRule = rule.toLowerCase();

    // 情况 1: 泛域名规则 (以 . 开头)
    if (cleanRule.startsWith('.')) {
      // 提取根域名，例如 .example.com -> example.com
      const rootDomain = cleanRule.substring(1);

      // 判定逻辑：
      // 1. 目标完全等于根域名 (example.com)
      // 2. 目标以规则结尾 (.example.com)，确保了不会匹配到 bad-example.com
      return target === rootDomain || target.endsWith(cleanRule);
    }

    // 情况 2: 精确匹配规则
    return target === cleanRule;
  });
}

// 判断是否为浏览器敏感路径
export function isSensitivePath(path: string): boolean {
  return /^\/(login|session|auth|settings|join|password_reset|admin|profile|api\/v\d)/i.test(path);
}
