import { WorkersRouter } from './src/adapters/workers-router.js';
export default {
    async fetch(request, env) {
        try {
            const router = new WorkersRouter(env);
            if (request.method === 'OPTIONS') {
                return router.handleCors(request);
            }
            const response = await Promise.race([
                router.route(request),
                new Promise((_, reject) => {
                    setTimeout(() => reject(new Error('Request timeout')), 30000);
                })
            ]);
            return router.addCorsHeaders(response, request);
        }
        catch (error) {
            console.error('Worker error:', error);
            let status = 500;
            let message = 'Internal server error';
            if (error instanceof Error) {
                if (error.message === 'Request timeout') {
                    status = 504;
                    message = 'Request timeout';
                }
                else if (error.message.includes('Configuration validation failed')) {
                    status = 500;
                    message = 'Service configuration error';
                }
            }
            const errorResponse = new Response(JSON.stringify({
                success: false,
                message,
                error: {
                    code: status === 504 ? 'REQUEST_TIMEOUT' : 'WORKER_ERROR',
                    timestamp: new Date().toISOString()
                }
            }), {
                status,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Credentials': 'true',
                    'X-Content-Type-Options': 'nosniff',
                    'X-Frame-Options': 'DENY'
                }
            });
            return errorResponse;
        }
    }
};
