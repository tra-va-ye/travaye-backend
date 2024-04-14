import Redis from 'ioredis';

export default class Cache {
	static client = null;

	constructor() {
		if (!Cache.client) {
			Cache.client = new Redis({
				host: process.env.REDIS_HOST,
				password: process.env.REDIS_PASSWORD,
				port: process.env.REDIS_PORT,
				user: process.env.REDIS_USER,
				// tls: {},
				reconnectOnError(err) {
					console.error(err);
					return false;
				},
			});
			Cache.client.on('connect', () => {
				console.log('Redis connected');
			});
		}
	}

	// async connect() {

	// }

	getClient() {
		return Cache.client;
	}
}
