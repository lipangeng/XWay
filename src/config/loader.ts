import { Env } from '../types';
import { app } from '../index';
import { defaultRoutes } from './router';
import { customRoutes } from '../custom/router';
import { AppConfig } from '../app';

const CONFIG_PREFIX = 'REMOTE_CONFIG_URL';
const CACHE_TTL = 60; // 缓存 60 秒，避免频繁拉取
const CONFIG_TTL = 12 * 60 * 60 * 1000; // 12 小时

// 更新时间
let UPDATE_AT = 0;

/* 加载配置文件 */
export function loadConfig(env: Env): AppConfig | undefined {
	let config = app.getConfig();
	if (!config) {
		config = {
			router: { ...defaultRoutes, ...customRoutes }
		};
	}
	return config;
}
