import dotenv from 'dotenv'

// Load environment-specific config
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env'
dotenv.config({ path: envFile })

export const config = {
  // Server configuration
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  host: process.env.HOST || '0.0.0.0',

  // Cloudflare API configuration
  cloudflareApiToken: process.env.CLOUDFLARE_API_TOKEN || 'F_Ce0FBCmUmaRF0REv11Jt81TgQGMMgEbXKhv37Z',
  cloudflareApiKey: process.env.CLOUDFLARE_API_KEY, // Global API Key (optional, alternative to token)
  cloudflareAccountId: process.env.CLOUDFLARE_ACCOUNT_ID || '03a089b46316b504243477dd3857196b',
  cloudflareEmail: process.env.CLOUDFLARE_EMAIL || 'dengjingwen@joyme.sg',
  cloudflareApiBaseUrl: 'https://api.cloudflare.com/client/v4',

  // Security configuration
  sessionSecret: process.env.SESSION_SECRET,
  corsOrigins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:5173'],

  // Logging configuration
  logLevel: process.env.LOG_LEVEL || 'info',

  // File upload configuration
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10), // 10MB
  allowedFileTypes: process.env.ALLOWED_FILE_TYPES?.split(',') || ['application/zip'],

  // Rate limiting configuration
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
  rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW || '900000', 10) // 15 minutes
}