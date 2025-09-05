export var ErrorType;
(function (ErrorType) {
    ErrorType["NETWORK_ERROR"] = "NETWORK_ERROR";
    ErrorType["VALIDATION_ERROR"] = "VALIDATION_ERROR";
    ErrorType["CLOUDFLARE_API_ERROR"] = "CLOUDFLARE_API_ERROR";
    ErrorType["FILE_UPLOAD_ERROR"] = "FILE_UPLOAD_ERROR";
    ErrorType["AUTHENTICATION_ERROR"] = "AUTHENTICATION_ERROR";
    ErrorType["SERVER_ERROR"] = "SERVER_ERROR";
    ErrorType["NOT_FOUND_ERROR"] = "NOT_FOUND_ERROR";
    ErrorType["DATABASE_ERROR"] = "DATABASE_ERROR";
    ErrorType["CONFIGURATION_ERROR"] = "CONFIGURATION_ERROR";
    ErrorType["CONFLICT_ERROR"] = "CONFLICT_ERROR";
})(ErrorType || (ErrorType = {}));
export class AppError extends Error {
    type;
    statusCode;
    details;
    constructor(type, message, statusCode = 500, details) {
        super(message);
        this.type = type;
        this.statusCode = statusCode;
        this.details = details;
        this.name = 'AppError';
    }
}
