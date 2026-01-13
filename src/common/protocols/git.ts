// 标准 Git 协议动作 (Discovery, Upload, Receive)
export function isGitAction(request: Request, preferred_path: string | null | undefined): boolean {
  const path = preferred_path || request.url;
  if (/(?:^|\/)(?:info\/refs|git-upload-pack|git-receive-pack)(?:\/|$)/i.test(path) || path.endsWith('.git')) {
    return true;
  }
  const service = new URL(path).searchParams.get('service');
  if (service === 'git-upload-pack' || service === 'git-receive-pack') {
    return true;
  }

  if (request) {
    const contentType = request.headers.get('Content-Type') || '';
    if (contentType.includes('git-upload-pack') || contentType.includes('git-receive-pack')) {
      return true;
    }
  }
  return false;
}

// 标准 Git LFS 动作
export function isLfsAction(request: Request, preferred_path: string | null | undefined): boolean {
  const path = preferred_path || request.url;
  return path.includes('/info/lfs/') || path.includes('/objects/batch');
}

// Git 客户端
export function isGitClient(request: Request, preferred_path: string | null | undefined): boolean {
  const ua = request.headers.get('User-Agent') || '';
  // 标准 Git 客户端: git/2.34.1
  // Go-git: go-git/5.0.0
  // Git LFS: git-lfs/3.2.0
  // 某些 IDE 插件可能会包含 git 字样
  return ua.startsWith('git/') ||
    ua.includes('git-lfs/') ||
    ua.includes('go-git/');
}

//  通用资源文件后缀
export function isGitResource(request: Request, preferred_path: string | null | undefined): boolean {
  const path = preferred_path || request.url;
  const staticExtensions = /\.(zip|tar\.gz|tgz|gz|7z|exe|msi|bin|raw|patch|diff)$/i;
  const resourceKeywords = /(?:^|\/)(?:raw|releases|archive|blob|tags|download|assets)(?:\/|$)/i;
  return staticExtensions.test(path) || resourceKeywords.test(path);
}
