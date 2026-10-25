import type { OtpProvider } from './otpProvider.interface.js';
import { MockOtpProvider } from './mockOtpProvider.js';
import { config } from '../../config/index.js';

let currentProvider: OtpProvider | null = null;

/**
 * Returns the configured OTP delivery provider instance.
 * Prohibits silent fallback to MockOtpProvider in production.
 */
export function getOtpProvider(): OtpProvider {
  if (currentProvider) {
    return currentProvider;
  }

  const providerType = config.otp.provider.trim().toLowerCase();

  // In production, reject mock provider explicitly
  if (config.nodeEnv === 'production') {
    if (!providerType || providerType === 'mock' || providerType === 'development') {
      throw new Error(
        'Production OTP safety violation: MockOtpProvider cannot be used in production mode.'
      );
    }
  }

  switch (providerType) {
    case 'mock':
    case 'development':
      currentProvider = new MockOtpProvider();
      break;
    default:
      // In production, do not silently fall back to mock
      if (config.nodeEnv === 'production') {
        throw new Error(
          `Production OTP safety violation: Unknown or unconfigured OTP provider "${providerType}". ` +
            'Silent fallback to MockOtpProvider is strictly forbidden in production.'
        );
      }
      console.warn(
        `[OtpProvider] Unknown provider "${providerType}". Falling back to MockOtpProvider in development mode.`
      );
      currentProvider = new MockOtpProvider();
      break;
  }

  return currentProvider;
}

/**
 * Allows overriding or resetting provider for unit testing.
 */
export function setOtpProvider(provider: OtpProvider | null): void {
  currentProvider = provider;
}

export * from './otpProvider.interface.js';
export * from './mockOtpProvider.js';
