import { serve } from '@hono/node-server';
import { createApp } from './routes';
import { config } from './config';

const app = createApp();

console.log(`AbcPay BWS starting on port ${config.port}`);
console.log(`API base: http://localhost:${config.port}${config.basePath}`);

serve({ fetch: app.fetch, port: config.port });
