export class WorkersResponseFormatter {
    static success(data, message, status = 200) {
        const response = {
            success: true,
            ...(data !== undefined && { data }),
            ...(message && { message })
        };
        return new Response(JSON.stringify(response), {
            status,
            headers: {
                'Content-Type': 'application/json'
            }
        });
    }
    static error(message, errorCode, status = 500, details) {
        const response = {
            success: false,
            message,
            error: {
                code: errorCode || 'UNKNOWN_ERROR',
                details
            }
        };
        return new Response(JSON.stringify(response), {
            status,
            headers: {
                'Content-Type': 'application/json'
            }
        });
    }
    static paginated(data, total, page, limit, message, status = 200) {
        const response = {
            success: true,
            data: {
                items: data,
                pagination: {
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit)
                }
            },
            ...(message && { message })
        };
        return new Response(JSON.stringify(response), {
            status,
            headers: {
                'Content-Type': 'application/json'
            }
        });
    }
    static created(data, message) {
        return this.success(data, message || 'Resource created successfully', 201);
    }
    static updated(data, message) {
        if (data !== undefined) {
            return this.success(data, message || 'Resource updated successfully', 200);
        }
        return this.success(undefined, message || 'Resource updated successfully', 200);
    }
    static deleted(message) {
        return this.success(undefined, message || 'Resource deleted successfully', 200);
    }
    static noContent(message) {
        return this.success(undefined, message || 'Operation completed successfully', 204);
    }
    static validationError(message, details) {
        return this.error(message, 'VALIDATION_ERROR', 400, details);
    }
    static notFound(message = 'Resource not found') {
        return this.error(message, 'NOT_FOUND', 404);
    }
    static unauthorized(message = 'Unauthorized') {
        return this.error(message, 'UNAUTHORIZED', 401);
    }
    static forbidden(message = 'Forbidden') {
        return this.error(message, 'FORBIDDEN', 403);
    }
}
