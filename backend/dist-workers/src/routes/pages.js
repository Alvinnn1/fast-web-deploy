import { cloudflareClient } from '../services/cloudflare-client.js';
import { ResponseFormatter, ErrorHandler } from '../utils/index.js';
function transformPagesProjectToPage(project) {
    const latestDeployment = project.latest_deployment;
    let status = 'created';
    let url;
    let deploymentId;
    let lastDeployedAt;
    if (latestDeployment) {
        deploymentId = latestDeployment.id;
        lastDeployedAt = latestDeployment.modified_on;
        url = latestDeployment.url;
        const deploymentStatus = latestDeployment.latest_stage?.status;
        switch (deploymentStatus) {
            case 'success':
                status = 'deployed';
                break;
            case 'failure':
            case 'canceled':
                status = 'failed';
                break;
            case 'active':
            case 'building':
                status = 'deploying';
                break;
            default:
                status = 'created';
        }
    }
    return {
        id: project.id,
        name: project.name,
        status,
        domains: project.domains,
        createdAt: project.created_on,
        ...(url && { url }),
        ...(deploymentId && { deploymentId }),
        ...(lastDeployedAt && { lastDeployedAt })
    };
}
function transformDeploymentToResult(deployment) {
    const status = deployment.latest_stage?.status;
    let mappedStatus = 'queued';
    switch (status) {
        case 'success':
            mappedStatus = 'success';
            break;
        case 'failure':
        case 'canceled':
            mappedStatus = 'failure';
            break;
        case 'active':
        case 'building':
            mappedStatus = 'building';
            break;
        case 'deploying':
            mappedStatus = 'deploying';
            break;
        default:
            mappedStatus = 'queued';
    }
    const errorMessage = status === 'failure' ? 'Deployment failed' : undefined;
    return {
        id: deployment.id,
        status: mappedStatus,
        ...(deployment.url && { url: deployment.url }),
        ...(errorMessage && { errorMessage })
    };
}
function transformDeploymentToStatus(deployment) {
    const status = deployment.latest_stage?.status;
    let mappedStatus = 'queued';
    let progress;
    switch (status) {
        case 'success':
            mappedStatus = 'success';
            progress = 100;
            break;
        case 'failure':
        case 'canceled':
            mappedStatus = 'failure';
            progress = 100;
            break;
        case 'active':
        case 'building':
            mappedStatus = 'building';
            progress = 50;
            break;
        case 'deploying':
            mappedStatus = 'deploying';
            progress = 80;
            break;
        default:
            mappedStatus = 'queued';
            progress = 0;
    }
    const logs = [];
    if (deployment.stages && Array.isArray(deployment.stages)) {
        deployment.stages.forEach((stage) => {
            logs.push(`${stage.name}: ${stage.status} (${stage.started_on})`);
        });
    }
    const errorMessage = status === 'failure' ? 'Deployment failed' : undefined;
    return {
        status: mappedStatus,
        ...(progress !== undefined && { progress }),
        ...(logs.length > 0 && { logs }),
        ...(deployment.url && { url: deployment.url }),
        ...(errorMessage && { errorMessage })
    };
}
export async function pagesRoutes(fastify) {
    fastify.get('/api/pages', async (_request, reply) => {
        try {
            const accountId = cloudflareClient.getConfiguredAccountId();
            const projects = await cloudflareClient.getPagesProjects(accountId);
            const pages = projects.map(transformPagesProjectToPage);
            return ResponseFormatter.success(pages, 'Pages retrieved successfully');
        }
        catch (error) {
            return ErrorHandler.handleRouteError(reply, error);
        }
    });
    fastify.post('/api/pages', async (request, reply) => {
        try {
            const { name } = request.body;
            if (!name || typeof name !== 'string' || name.trim().length === 0) {
                throw ErrorHandler.createValidationError('Project name is required');
            }
            const projectNameRegex = /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/;
            const trimmedName = name.trim().toLowerCase();
            if (trimmedName.length < 1 || trimmedName.length > 58) {
                throw ErrorHandler.createValidationError('Project name must be between 1 and 58 characters');
            }
            if (!projectNameRegex.test(trimmedName)) {
                throw ErrorHandler.createValidationError('Project name must contain only lowercase letters, numbers, and hyphens. It cannot start or end with a hyphen.');
            }
            const accountId = cloudflareClient.getConfiguredAccountId();
            try {
                await cloudflareClient.getPagesProject(accountId, trimmedName);
                throw ErrorHandler.createValidationError('A project with this name already exists');
            }
            catch (error) {
                if (error.statusCode !== 404) {
                    throw error;
                }
            }
            const project = await cloudflareClient.createPagesProject(accountId, trimmedName, {
                build_config: {
                    destination_dir: '/',
                    root_dir: '/'
                },
                production_branch: 'main'
            });
            const page = transformPagesProjectToPage(project);
            return ResponseFormatter.success(page, 'Page project created successfully');
        }
        catch (error) {
            return ErrorHandler.handleRouteError(reply, error);
        }
    });
    fastify.post('/api/pages/:projectName/deploy', async (request, reply) => {
        try {
            const { projectName } = request.params;
            const { manifest } = request.body;
            if (!projectName || typeof projectName !== 'string') {
                throw ErrorHandler.createValidationError('Page project name is required');
            }
            if (!manifest || typeof manifest !== 'object') {
                throw ErrorHandler.createValidationError('Manifest is required');
            }
            const accountId = cloudflareClient.getConfiguredAccountId();
            const deployment = await cloudflareClient.createPagesDeploymentWithManifest(accountId, projectName, manifest);
            const result = transformDeploymentToResult(deployment);
            return ResponseFormatter.success(result, 'Deployment created successfully');
        }
        catch (error) {
            return ErrorHandler.handleRouteError(reply, error);
        }
    });
    fastify.get('/api/pages/:projectName/upload-url', async (request, reply) => {
        try {
            const { projectName } = request.params;
            if (!projectName || typeof projectName !== 'string') {
                throw ErrorHandler.createValidationError('Page project name is required');
            }
            const accountId = cloudflareClient.getConfiguredAccountId();
            const data = await cloudflareClient.createPagesDeploymentUploadJwt(accountId, projectName);
            return ResponseFormatter.success({
                jwt: data.jwt
            }, 'Upload URL generated successfully');
        }
        catch (error) {
            return ErrorHandler.handleRouteError(reply, error);
        }
    });
    fastify.get('/api/pages/:projectName/deployment-status', async (request, reply) => {
        try {
            const { projectName } = request.params;
            const { deploymentId } = request.query;
            if (!projectName || typeof projectName !== 'string') {
                throw ErrorHandler.createValidationError('Page project name is required');
            }
            const accountId = cloudflareClient.getConfiguredAccountId();
            let deployment;
            if (deploymentId) {
                try {
                    deployment = await cloudflareClient.getPagesDeployment(accountId, projectName, deploymentId);
                }
                catch (error) {
                    if (error.statusCode === 404) {
                        throw ErrorHandler.createValidationError('Deployment not found');
                    }
                    throw error;
                }
            }
            else {
                try {
                    const project = await cloudflareClient.getPagesProject(accountId, projectName);
                    if (!project.latest_deployment) {
                        throw ErrorHandler.createValidationError('No deployments found for this project');
                    }
                    deployment = project.latest_deployment;
                }
                catch (error) {
                    if (error.statusCode === 404) {
                        throw ErrorHandler.createValidationError('Page project not found');
                    }
                    throw error;
                }
            }
            const deploymentStatus = transformDeploymentToStatus(deployment);
            return ResponseFormatter.success(deploymentStatus, 'Deployment status retrieved successfully');
        }
        catch (error) {
            return ErrorHandler.handleRouteError(reply, error);
        }
    });
    fastify.post('/api/pages/assets/check-missing', async (request, reply) => {
        try {
            const { jwt, hashes } = request.body;
            if (!jwt || typeof jwt !== 'string' || jwt.trim().length === 0) {
                throw ErrorHandler.createValidationError('JWT token is required');
            }
            if (!hashes || !Array.isArray(hashes)) {
                throw ErrorHandler.createValidationError('Hashes array is required');
            }
            if (hashes.length === 0) {
                throw ErrorHandler.createValidationError('At least one hash is required');
            }
            for (const hash of hashes) {
                if (typeof hash !== 'string' || hash.trim().length === 0) {
                    throw ErrorHandler.createValidationError('All hashes must be non-empty strings');
                }
            }
            const result = await cloudflareClient.checkMissingAssets(jwt.trim(), hashes);
            return ResponseFormatter.success(result, 'Missing assets checked successfully');
        }
        catch (error) {
            return ErrorHandler.handleRouteError(reply, error);
        }
    });
    fastify.post('/api/pages/assets/upload', async (request, reply) => {
        try {
            const { jwt, payload } = request.body;
            if (!jwt || typeof jwt !== 'string' || jwt.trim().length === 0) {
                throw ErrorHandler.createValidationError('JWT token is required');
            }
            if (!payload || !Array.isArray(payload)) {
                throw ErrorHandler.createValidationError('Payload array is required');
            }
            if (payload.length === 0) {
                throw ErrorHandler.createValidationError('At least one upload payload is required');
            }
            for (const item of payload) {
                if (!item || typeof item !== 'object') {
                    throw ErrorHandler.createValidationError('Each payload item must be an object');
                }
                if (typeof item.base64 !== 'boolean') {
                    throw ErrorHandler.createValidationError('Payload item base64 field must be a boolean');
                }
                if (!item.key || typeof item.key !== 'string' || item.key.trim().length === 0) {
                    throw ErrorHandler.createValidationError('Payload item key must be a non-empty string');
                }
                if (!item.value || typeof item.value !== 'string' || item.value.trim().length === 0) {
                    throw ErrorHandler.createValidationError('Payload item value must be a non-empty string');
                }
                if (!item.metadata || typeof item.metadata !== 'object') {
                    throw ErrorHandler.createValidationError('Payload item metadata must be an object');
                }
                if (!item.metadata.contentType || typeof item.metadata.contentType !== 'string' || item.metadata.contentType.trim().length === 0) {
                    throw ErrorHandler.createValidationError('Payload item metadata.contentType must be a non-empty string');
                }
            }
            const result = await cloudflareClient.uploadAssets(jwt.trim(), payload);
            return ResponseFormatter.success(result, 'Assets uploaded successfully');
        }
        catch (error) {
            return ErrorHandler.handleRouteError(reply, error);
        }
    });
    fastify.get('/api/pages/:projectName/domains', async (request, reply) => {
        try {
            const { projectName } = request.params;
            if (!projectName || typeof projectName !== 'string') {
                throw ErrorHandler.createValidationError('Page project name is required');
            }
            const accountId = cloudflareClient.getConfiguredAccountId();
            const domains = await cloudflareClient.getPagesProjectDomains(accountId, projectName);
            return ResponseFormatter.success(domains, 'Project domains retrieved successfully');
        }
        catch (error) {
            return ErrorHandler.handleRouteError(reply, error);
        }
    });
    fastify.post('/api/pages/:projectName/domains', async (request, reply) => {
        try {
            const { projectName } = request.params;
            const { name } = request.body;
            if (!projectName || typeof projectName !== 'string') {
                throw ErrorHandler.createValidationError('Page project name is required');
            }
            if (!name || typeof name !== 'string' || name.trim().length === 0) {
                throw ErrorHandler.createValidationError('Domain name is required');
            }
            const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
            const trimmedName = name.trim().toLowerCase();
            if (!domainRegex.test(trimmedName)) {
                throw ErrorHandler.createValidationError('Invalid domain name format');
            }
            const accountId = cloudflareClient.getConfiguredAccountId();
            const domain = await cloudflareClient.addPagesProjectDomain(accountId, projectName, trimmedName);
            return ResponseFormatter.success(domain, 'Domain added to project successfully');
        }
        catch (error) {
            return ErrorHandler.handleRouteError(reply, error);
        }
    });
    fastify.delete('/api/pages/:projectName/domains/:domainName', async (request, reply) => {
        try {
            const { projectName, domainName } = request.params;
            if (!projectName || typeof projectName !== 'string') {
                throw ErrorHandler.createValidationError('Page project name is required');
            }
            if (!domainName || typeof domainName !== 'string') {
                throw ErrorHandler.createValidationError('Domain name is required');
            }
            const accountId = cloudflareClient.getConfiguredAccountId();
            await cloudflareClient.deletePagesProjectDomain(accountId, projectName, domainName);
            return ResponseFormatter.success(null, 'Domain deleted from project successfully');
        }
        catch (error) {
            return ErrorHandler.handleRouteError(reply, error);
        }
    });
}
