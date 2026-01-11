import { ParsedRoute, RouteMap } from '../types/router';
import { RouteMatchType, ServiceType } from '../constants';

/**
 * 路由引擎
 */
export function parseRoute(request: Request, routes: RouteMap): ParsedRoute {
  // 前置入参校验（防空）
  if (!request || !routes || typeof routes !== 'object') {
    return {
      key: null,
      upstream: null,
      config: null,
      path: '/',
      matchType: RouteMatchType.NONE
    };
  }

  const url = new URL(request.url);
  const { pathname } = url;

  // 1. 全域名及子域名匹配 (域名层级的逻辑最直接，优先处理)
  const domainMatch = matchDomain(url, request, routes);
  if (domainMatch) return domainMatch;

  if (pathname.length <= 1) return { key: null, upstream: null, config: null, path: pathname, matchType: RouteMatchType.NONE, raw: null };

  const dockerMatch = matchDockerV2Path(url, request, routes);
  if (dockerMatch) return dockerMatch;

  const genericPathMatch = matchGenericPath(url, request, routes);
  if (genericPathMatch) return genericPathMatch;

  return {
    key: null,
    config: null,
    path: url.pathname,
    upstream: null,
    matchType: RouteMatchType.NONE,
    raw: null
  };
}

// =============================================================================
// 域名匹配逻辑 (O(1) 贪婪搜索)
// =============================================================================
function matchDomain(url: URL, request: Request, routes: RouteMap): ParsedRoute | null {
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
function matchDockerV2Path(url: URL, request: Request, routes: RouteMap): ParsedRoute | null {
  const pathname = url.pathname;

  // 前置检查：必须是 /v2/ 开头且符合容器客户端特征
  if (!pathname.startsWith('/v2/') || !isDockerRequest(request)) return null;

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
function matchGenericPath(url: URL, request: Request, routes: RouteMap): ParsedRoute | null {
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

// 判断是否Docker请求，仅Path模式下使用
function isDockerRequest(request: Request): boolean {
  const headers = request.headers;
  const ua = headers.get('User-Agent')?.toLowerCase() || '';
  const accept = headers.get('Accept')?.toLowerCase() || '';
  // 1. 协议特征检测 (最准确)
  if (accept.includes('vnd.docker') || accept.includes('vnd.oci')) {
    return true;
  }
  // 2. 客户端特征检测
  // 用于覆盖 docker login / 握手 等不带特殊 Accept 的场景
  const knownClients = [
    'docker/',      // Docker CLI
    'containerd/',  // Kubernetes / Containerd
    'kaniko/',      // CI/CD 构建工具
    'podman/',      // RedHat Podman
    'crio/',
    'cri-o/',       // K8s Runtime
    'buildkit/',    // Docker Buildx
    'skopeo/'       // 镜像搬运工具
  ];

  return knownClients.some(client => ua.includes(client));
}
