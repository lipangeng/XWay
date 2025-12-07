import { Handler } from '../types';

export const HomeHandler: Handler = async (ctx) => {
	return new Response('Hello World');
};
