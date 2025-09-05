import { WorkersResponseFormatter } from '../workers-response-formatter.js';
import { WorkersErrorHandler } from '../workers-error-handler.js';
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
export class PagesHandler {
    cloudflareClient;
    constructor(cloudflareClient) {
        this.cloudflareClient = cloudflareClient;
    }
    async handle(request, pathname, method) {
        try {
            const url = new URL(request.url);
            const pathParts = pathname.split('/').filter(Boolean);
            if (pathParts.length === 2 && pathParts[1] === 'pages' && method === 'GET') {
                return this.getAllPages();
            }
            if (pathParts.length === 2 && pathParts[1] === 'pages' && method === 'POST') {
                return this.createPage(request);
            }
            if (pathParts.length === 4 && pathParts[1] === 'pages' && pathParts[3] === 'deploy' && method === 'POST') {
                const projectName = pathParts[2];
                return this.deployPage(request, projectName);
            }
            if (pathParts.length === 4 && pathParts[1] === 'pages' && pathParts[3] === 'upload-url' && method === 'GET') {
                const projectName = pathParts[2];
                return this.getUploadUrl(projectName);
            }
            if (pathParts.length === 4 && pathParts[1] === 'pages' && pathParts[3] === 'deployment-status' && method === 'GET') {
                const projectName = pathParts[2];
                const deploymentId = url.searchParams.get('deploymentId');
                return this.getDeploymentStatus(projectName, deploymentId);
            }
            if (pathParts.length === 4 && pathParts[1] === 'pages' && pathParts[2] === 'assets' && pathParts[3] === 'check-missing' && method === 'POST') {
                return this.checkMissingAssets(request);
            }
            if (pathParts.length === 4 && pathParts[1] === 'pages' && pathParts[2] === 'assets' && pathParts[3] === 'upload' && method === 'POST') {
                return this.uploadAssets(request);
            }
            if (pathParts.length === 4 && pathParts[1] === 'pages' && pathParts[3] === 'domains' && method === 'GET') {
                const projectName = pathParts[2];
                return this.getProjectDomains(projectName);
            }
            if (pathParts.length === 4 && pathParts[1] === 'pages' && pathParts[3] === 'domains' && method === 'POST') {
                const projectName = pathParts[2];
                return this.addProjectDomain(request, projectName);
            }
            if (pathParts.length === 5 && pathParts[1] === 'pages' && pathParts[3] === 'domains' && method === 'DELETE') {
                const projectName = pathParts[2];
                const domainName = pathParts[4];
                return this.deleteProjectDomain(projectName, domainName);
            }
            return WorkersResponseFormatter.notFound('Pages endpoint not found');
        }
        catch (error) {
            return WorkersErrorHandler.createErrorResponse(error);
        }
    }
    async getAllPages() {
        const accountId = this.cloudflareClient.getConfiguredAccountId();
        const projects = await this.cloudflareClient.getPagesProjects(accountId);
        const pages = projects.map(transformPagesProjectToPage);
        return WorkersResponseFormatter.success(pages, 'Pages retrieved successfully');
    }
    async createPage(request) {
        const body = await request.json();
        const { name } = body;
        if (!name || typeof name !== 'string' || name.trim().length === 0) {
            throw WorkersErrorHandler.createValidationError('Project name is required');
        }
        const projectNameRegex = /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/;
        const trimmedName = name.trim().toLowerCase();
        if (trimmedName.length < 1 || trimmedName.length > 58) {
            throw WorkersErrorHandler.createValidationError('Project name must be between 1 and 58 characters');
        }
        if (!projectNameRegex.test(trimmedName)) {
            throw WorkersErrorHandler.createValidationError('Project name must contain only lowercase letters, numbers, and hyphens. It cannot start or end with a hyphen.');
        }
        const accountId = this.cloudflareClient.getConfiguredAccountId();
        try {
            await this.cloudflareClient.getPagesProject(accountId, trimmedName);
            throw WorkersErrorHandler.createValidationError('A project with this name already exists');
        }
        catch (error) {
            if (error.statusCode !== 404) {
                throw error;
            }
        }
        const project = await this.cloudflareClient.createPagesProject(accountId, trimmedName, {
            build_config: {
                destination_dir: '/',
                root_dir: '/'
            },
            production_branch: 'main'
        });
        const page = transformPagesProjectToPage(project);
        return WorkersResponseFormatter.success(page, 'Page project created successfully');
    }
    async deployPage(request, projectName) {
        if (!projectName || typeof projectName !== 'string') {
            throw WorkersErrorHandler.createValidationError('Page project name is required');
        }
        const body = await request.json();
        const { manifest } = body;
        if (!manifest || typeof manifest !== 'object') {
            throw WorkersErrorHandler.createValidationError('Manifest is required');
        }
        const accountId = this.cloudflareClient.getConfiguredAccountId();
        const deployment = await this.cloudflareClient.createPagesDeploymentWithManifest(accountId, projectName, manifest);
        const result = transformDeploymentToResult(deployment);
        return WorkersResponseFormatter.success(result, 'Deployment created successfully');
    }
    async getUploadUrl(projectName) {
        if (!projectName || typeof projectName !== 'string') {
            throw WorkersErrorHandler.createValidationError('Page project name is required');
        }
        const accountId = this.cloudflareClient.getConfiguredAccountId();
        const data = await this.cloudflareClient.createPagesDeploymentUploadJwt(accountId, projectName);
        return WorkersResponseFormatter.success({
            jwt: data.jwt
        }, 'Upload URL generated successfully');
    }
    async getDeploymentStatus(projectName, deploymentId) {
        if (!projectName || typeof projectName !== 'string') {
            throw WorkersErrorHandler.createValidationError('Page project name is required');
        }
        const accountId = this.cloudflareClient.getConfiguredAccountId();
        let deployment;
        if (deploymentId) {
            try {
                deployment = await this.cloudflareClient.getPagesDeployment(accountId, projectName, deploymentId);
            }
            catch (error) {
                if (error.statusCode === 404) {
                    throw WorkersErrorHandler.createValidationError('Deployment not found');
                }
                throw error;
            }
        }
        else {
            try {
                const project = await this.cloudflareClient.getPagesProject(accountId, projectName);
                if (!project.latest_deployment) {
                    throw WorkersErrorHandler.createValidationError('No deployments found for this project');
                }
                deployment = project.latest_deployment;
            }
            catch (error) {
                if (error.statusCode === 404) {
                    throw WorkersErrorHandler.createValidationError('Page project not found');
                }
                throw error;
            }
        }
        const deploymentStatus = transformDeploymentToStatus(deployment);
        return WorkersResponseFormatter.success(deploymentStatus, 'Deployment status retrieved successfully');
    }
    async checkMissingAssets(request) {
        const body = await request.json();
        const { jwt, hashes } = body;
        if (!jwt || typeof jwt !== 'string' || jwt.trim().length === 0) {
            throw WorkersErrorHandler.createValidationError('JWT token is required');
        }
        if (!hashes || !Array.isArray(hashes)) {
            throw WorkersErrorHandler.createValidationError('Hashes array is required');
        }
        if (hashes.length === 0) {
            throw WorkersErrorHandler.createValidationError('At least one hash is required');
        }
        for (const hash of hashes) {
            if (typeof hash !== 'string' || hash.trim().length === 0) {
                throw WorkersErrorHandler.createValidationError('All hashes must be non-empty strings');
            }
        }
        const result = await this.cloudflareClient.checkMissingAssets(jwt.trim(), hashes);
        return WorkersResponseFormatter.success(result, 'Missing assets checked successfully');
    }
    async uploadAssets(request) {
        const body = await request.json();
        const { jwt, payload } = body;
        if (!jwt || typeof jwt !== 'string' || jwt.trim().length === 0) {
            throw WorkersErrorHandler.createValidationError('JWT token is required');
        }
        if (!payload || !Array.isArray(payload)) {
            throw WorkersErrorHandler.createValidationError('Payload array is required');
        }
        if (payload.length === 0) {
            throw WorkersErrorHandler.createValidationError('At least one upload payload is required');
        }
        for (const item of payload) {
            if (!item || typeof item !== 'object') {
                throw WorkersErrorHandler.createValidationError('Each payload item must be an object');
            }
            if (typeof item.base64 !== 'boolean') {
                throw WorkersErrorHandler.createValidationError('Payload item base64 field must be a boolean');
            }
            if (!item.key || typeof item.key !== 'string' || item.key.trim().length === 0) {
                throw WorkersErrorHandler.createValidationError('Payload item key must be a non-empty string');
            }
            if (!item.value || typeof item.value !== 'string' || item.value.trim().length === 0) {
                throw WorkersErrorHandler.createValidationError('Payload item value must be a non-empty string');
            }
            if (!item.metadata || typeof item.metadata !== 'object') {
                throw WorkersErrorHandler.createValidationError('Payload item metadata must be an object');
            }
            if (!item.metadata.contentType || typeof item.metadata.contentType !== 'string' || item.metadata.contentType.trim().length === 0) {
                throw WorkersErrorHandler.createValidationError('Payload item metadata.contentType must be a non-empty string');
            }
        }
        const result = await this.cloudflareClient.uploadAssets(jwt.trim(), payload);
        return WorkersResponseFormatter.success(result, 'Assets uploaded successfully');
    }
    async getProjectDomains(projectName) {
        if (!projectName || typeof projectName !== 'string') {
            throw WorkersErrorHandler.createValidationError('Page project name is required');
        }
        const accountId = this.cloudflareClient.getConfiguredAccountId();
        const domains = await this.cloudflareClient.getPagesProjectDomains(accountId, projectName);
        return WorkersResponseFormatter.success(domains, 'Project domains retrieved successfully');
    }
    async addProjectDomain(request, projectName) {
        if (!projectName || typeof projectName !== 'string') {
            throw WorkersErrorHandler.createValidationError('Page project name is required');
        }
        const body = await request.json();
        const { name } = body;
        if (!name || typeof name !== 'string' || name.trim().length === 0) {
            throw WorkersErrorHandler.createValidationError('Domain name is required');
        }
        const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
        const trimmedName = name.trim().toLowerCase();
        if (!domainRegex.test(trimmedName)) {
            throw WorkersErrorHandler.createValidationError('Invalid domain name format');
        }
        const accountId = this.cloudflareClient.getConfiguredAccountId();
        const domain = await this.cloudflareClient.addPagesProjectDomain(accountId, projectName, trimmedName);
        return WorkersResponseFormatter.success(domain, 'Domain added to project successfully');
    }
    async deleteProjectDomain(projectName, domainName) {
        if (!projectName || typeof projectName !== 'string') {
            throw WorkersErrorHandler.createValidationError('Page project name is required');
        }
        if (!domainName || typeof domainName !== 'string') {
            throw WorkersErrorHandler.createValidationError('Domain name is required');
        }
        const accountId = this.cloudflareClient.getConfiguredAccountId();
        await this.cloudflareClient.deletePagesProjectDomain(accountId, projectName, domainName);
        return WorkersResponseFormatter.success(null, 'Domain deleted from project successfully');
    }
}
