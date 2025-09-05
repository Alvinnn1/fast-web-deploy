import Fastify from 'fastify';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import { config } from './config/index.js';
import { errorMiddleware } from './middleware/error-middleware.js';
import { simpleSecurityMiddleware } from './middleware/security-middleware-simple.js';
import { ResponseFormatter, ErrorHandler } from './utils/index.js';
import { domainsRoutes } from './routes/domains.js';
import { pagesRoutes } from './routes/pages.js';
import { monitoringRoutes } from './routes/monitoring.js';
import { healthCheckService } from './services/health-check.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const fastify = Fastify({
    bodyLimit: config.maxFileSize || 10 * 1024 * 1024,
    logger: {
        level: config.logLevel || 'info'
    }
});
await fastify.register(errorMiddleware);
await simpleSecurityMiddleware.register(fastify);
await fastify.register(multipart, {
    limits: {
        fileSize: config.maxFileSize || 10 * 1024 * 1024
    }
});
if (config.nodeEnv === 'production') {
    await fastify.register(fastifyStatic, {
        root: join(__dirname, '..', 'public'),
        prefix: '/'
    });
    fastify.setNotFoundHandler((request, reply) => {
        if (request.url.startsWith('/api/')) {
            reply.code(404).send({ error: 'API endpoint not found' });
        }
        else {
            reply.sendFile('index.html');
        }
    });
}
fastify.get('/health', async (_request, reply) => {
    try {
        const healthResult = await healthCheckService.performHealthCheck();
        let statusCode = 200;
        if (healthResult.status === 'degraded') {
            statusCode = 200;
        }
        else if (healthResult.status === 'unhealthy') {
            statusCode = 503;
        }
        reply.code(statusCode);
        return ResponseFormatter.success(healthResult, 'Health check completed');
    }
    catch (error) {
        reply.code(503);
        return ResponseFormatter.error('Health check failed', error instanceof Error ? error.message : 'Unknown error');
    }
});
fastify.get('/health/simple', async () => {
    return healthCheckService.getSimpleHealthCheck();
});
fastify.get('/api/test', async () => {
    return ResponseFormatter.success({ message: 'Backend API is working!' }, 'API test successful');
});
fastify.get('/api/test-error', async () => {
    throw ErrorHandler.createValidationError('This is a test validation error');
});
await fastify.register(domainsRoutes);
await fastify.register(pagesRoutes);
await fastify.register(monitoringRoutes);
const start = async () => {
    try {
        await fastify.listen({
            port: config.port,
            host: config.host
        });
        console.log(`Server listening on http://${config.host}:${config.port}`);
    }
    catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
};
start();
