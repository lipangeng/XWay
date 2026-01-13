// 判断是否Docker请求，仅Path模式下使用
export function isContainerRequest(request: Request): boolean {
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
