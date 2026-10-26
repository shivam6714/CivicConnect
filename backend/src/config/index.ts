import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

export interface AppConfig {
  port: number;
  nodeEnv: 'development' | 'production' | 'test';
  corsOrigin: string | string[];
  corsCredentials: boolean;
  enableDb: boolean;
  mongoUri: string;
  jwtSecret: string;
  jwtExpiresIn: string;
  otpSecret: string;
  otp: {
    provider: string;
    expiryMinutes: number;
    maxAttempts: number;
    resendCooldownSeconds: number;
  };
  storage: {
    provider: 'local' | 's3';
    localDir: string;
    maxFileSizeBytes: number;
    allowedMimeTypes: string[];
    publicBaseUrl?: string;
    s3?: {
      bucket?: string;
      region?: string;
      accessKeyId?: string;
      secretAccessKey?: string;
      endpoint?: string;
    };
  };
}

export const KNOWN_PLACEHOLDER_JWT_SECRETS = new Set([
  'your_jwt_secret_key_change_in_production',
  'civicconnect_dev_insecure_secret_change_in_production',
  'dev_jwt_secret_civicconnect_jammu_2026',
  'dev_jwt_secret_change_in_production_min_32_chars_long',
  'dev_otp_pepper_secret_change_in_production_min_32_chars_long',
  'dev_otp_pepper_secret_civicconnect_jammu_2026',
  'secret',
  'changeme',
  'jwt_secret',
  'otp_secret',
  'password',
  '1234567890',
]);

export const MIN_JWT_SECRET_LENGTH = 32;

/**
 * Parses CORS origins and ensures credentials are never paired with a wildcard.
 * When wildcard '*' is used, credentials must be false per CORS security specifications.
 */
export function parseCorsConfig(origin: string | undefined): {
  corsOrigin: string | string[];
  corsCredentials: boolean;
} {
  if (!origin || origin.trim() === '' || origin.trim() === '*') {
    return {
      corsOrigin: '*',
      corsCredentials: false,
    };
  }

  const rawOrigins = origin.includes(',')
    ? origin.split(',').map((o) => o.trim()).filter(Boolean)
    : [origin.trim()];

  // When local development origins are configured (such as http://localhost:5173),
  // ensure the actual local frontend dev server origin (http://localhost:3000 and http://127.0.0.1:3000)
  // as well as port 5173 are permitted for browser communication.
  const originSet = new Set<string>();
  for (const o of rawOrigins) {
    originSet.add(o);
    if (o.includes('localhost') || o.includes('127.0.0.1')) {
      originSet.add('http://localhost:3000');
      originSet.add('http://127.0.0.1:3000');
      originSet.add('http://localhost:5173');
      originSet.add('http://127.0.0.1:5173');
    }
  }

  const origins = Array.from(originSet);

  return {
    corsOrigin: origins.length > 0 ? origins : '*',
    corsCredentials: origins.length > 0,
  };
}

const nodeEnv = (process.env.NODE_ENV || 'development') as 'development' | 'production' | 'test';
const enableDb = process.env.ENABLE_DB === 'true';
const mongoUri = process.env.MONGODB_URI || '';
const corsSettings = parseCorsConfig(process.env.CORS_ORIGIN);

export const config: AppConfig = {
  port: parseInt(process.env.PORT || '8000', 10),
  nodeEnv,
  corsOrigin: corsSettings.corsOrigin,
  corsCredentials: corsSettings.corsCredentials,
  enableDb,
  mongoUri,
  jwtSecret: process.env.JWT_SECRET || 'civicconnect_dev_insecure_secret_change_in_production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  otpSecret: process.env.OTP_SECRET || 'dev_otp_pepper_secret_civicconnect_jammu_2026',
  otp: {
    provider: process.env.OTP_PROVIDER || 'mock',
    expiryMinutes: parseInt(process.env.OTP_EXPIRY_MINUTES || '5', 10),
    maxAttempts: parseInt(process.env.OTP_MAX_ATTEMPTS || '3', 10),
    resendCooldownSeconds: parseInt(process.env.OTP_RESEND_COOLDOWN_SECONDS || '60', 10),
  },
  storage: {
    provider: (process.env.STORAGE_PROVIDER?.toLowerCase() === 's3' ? 's3' : 'local') as 'local' | 's3',
    localDir: process.env.STORAGE_LOCAL_DIR || 'uploads',
    maxFileSizeBytes: parseInt(process.env.STORAGE_MAX_FILE_SIZE_BYTES || String(5 * 1024 * 1024), 10),
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    publicBaseUrl: process.env.STORAGE_PUBLIC_BASE_URL,
    s3: {
      bucket: process.env.S3_BUCKET,
      region: process.env.S3_REGION || 'us-east-1',
      accessKeyId: process.env.S3_ACCESS_KEY_ID,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
      endpoint: process.env.S3_ENDPOINT,
    },
  },
};

/**
 * Validates configuration required for the current execution mode.
 * Throws a clear, descriptive Error if required parameters are missing or unsafe.
 */
export function validateConfig(): void {
  // Database configuration validation
  if (config.enableDb && !config.mongoUri) {
    throw new Error(
      'Configuration Error: ENABLE_DB is set to true, but MONGODB_URI is missing or empty. ' +
      'Please define MONGODB_URI in your environment or set ENABLE_DB=false to run without a database.'
    );
  }

  // Storage configuration validation
  if (config.storage.provider === 's3') {
    const s3 = config.storage.s3;
    if (!s3?.bucket || !s3?.accessKeyId || !s3?.secretAccessKey) {
      throw new Error(
        'Configuration Error: S3 storage provider is configured (STORAGE_PROVIDER=s3), but required S3 credentials (S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY) are missing. Please provide the required S3 environment variables or switch to STORAGE_PROVIDER=local.'
      );
    }
  }

  // Production-specific security validations
  if (config.nodeEnv === 'production') {
    // 1. OTP Provider Safety in Production
    const otpProvider = config.otp.provider.trim().toLowerCase();
    if (!otpProvider || otpProvider === 'mock' || otpProvider === 'development') {
      throw new Error(
        'Configuration Error: OTP_PROVIDER cannot be "mock" in production mode. ' +
        'A production SMS gateway provider must be configured to prevent mock authentication in production.'
      );
    }

    // 2. JWT Secret Safety in Production
    if (!config.jwtSecret || config.jwtSecret.trim().length === 0) {
      throw new Error(
        'Configuration Error: JWT_SECRET is required and cannot be empty in production.'
      );
    }

    const normalizedSecret = config.jwtSecret.trim().toLowerCase();
    if (KNOWN_PLACEHOLDER_JWT_SECRETS.has(normalizedSecret)) {
      throw new Error(
        'Configuration Error: JWT_SECRET is set to an insecure placeholder value. ' +
        'A secure, randomly generated secret is required in production.'
      );
    }

    if (config.jwtSecret.length < MIN_JWT_SECRET_LENGTH) {
      throw new Error(
        `Configuration Error: JWT_SECRET must be at least ${MIN_JWT_SECRET_LENGTH} characters long in production for cryptographic security.`
      );
    }

    // 3. OTP Pepper Secret Safety in Production
    if (!config.otpSecret || config.otpSecret.trim().length === 0) {
      throw new Error(
        'Configuration Error: OTP_SECRET is required and cannot be empty in production.'
      );
    }

    const normalizedOtpSecret = config.otpSecret.trim().toLowerCase();
    if (KNOWN_PLACEHOLDER_JWT_SECRETS.has(normalizedOtpSecret)) {
      throw new Error(
        'Configuration Error: OTP_SECRET is set to an insecure placeholder value. ' +
        'A secure, randomly generated secret is required in production.'
      );
    }

    if (config.otpSecret.length < MIN_JWT_SECRET_LENGTH) {
      throw new Error(
        `Configuration Error: OTP_SECRET must be at least ${MIN_JWT_SECRET_LENGTH} characters long in production for cryptographic security.`
      );
    }
  }
}