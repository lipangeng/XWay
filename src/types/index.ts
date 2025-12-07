import { AppContext } from '../app';

export interface Env {
	ROUTE_MODE?: string; // 可选: 'auto' | 'domain' | 'path'
	BASE_DOMAIN?: string; // 本程序的基本域名

	// 允许读取 REMOTE_CONFIG_URL_XX
	[key: string]: string | undefined;
}

export type Middleware = (ctx: AppContext, next: () => Promise<Response>) => Promise<Response>;

export type Handler = (ctx: AppContext) => Promise<Response>;
