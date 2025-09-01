export class ResponseFormatter {
    static success(data, message) {
        return {
            success: true,
            ...(data !== undefined && { data }),
            ...(message && { message })
        };
    }
    static error(message, errorCode, details) {
        return {
            success: false,
            message,
            error: {
                code: errorCode || 'UNKNOWN_ERROR',
                details
            }
        };
    }
    static paginated(data, total, page, limit, message) {
        return {
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
    }
    static created(data, message) {
        return {
            success: true,
            data,
            message: message || 'Resource created successfully'
        };
    }
    static updated(dataOrMessage, message) {
        if (typeof dataOrMessage === 'string') {
            return {
                success: true,
                message: dataOrMessage || 'Resource updated successfully'
            };
        }
        return {
            success: true,
            data: dataOrMessage,
            message: message || 'Resource updated successfully'
        };
    }
    static deleted(message) {
        return {
            success: true,
            message: message || 'Resource deleted successfully'
        };
    }
    static noContent(message) {
        return {
            success: true,
            message: message || 'Operation completed successfully'
        };
    }
}
