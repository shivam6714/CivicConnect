import type { OtpProvider } from './otpProvider.interface.js';
import { MockOtpProvider } from './mockOtpProvider.js';
import { config } from '../../config/index.js';

let currentProvider: OtpProvider | null = null;

/**
 * Checks if the application is running in an automated test environment.
 */
export function isTestMode(): boolean {
  return (
    config.nodeEnv === 'test' ||
    process.env.NODE_ENV === 'test' ||
    process.env.CIVICCONNECT_TEST_MODE === 'true'
  );
}

/**
 * Returns the configured OTP delivery provider instance.
 * Prohibits silent fallback to MockOtpProvider in production.
 * Ensures automated tests use MockOtpProvider and never real SMS providers.
 */
export function getOtpProvider(): OtpProvider {
  // Test Mode Safety Guard: Checks MUST run before returning any cached provider.
  // When test mode is active, automated tests must NEVER send real SMS messages or reuse a real provider.
  if (isTestMode()) {
    const providerType = (config.otp.provider || 'mock').trim().toLowerCase();
    if (providerType !== 'mock' && providerType !== 'development') {
      throw new Error(
        `Test Safety Violation: Automated tests are strictly prohibited from using real SMS providers ("${providerType}") ` +
          'or consuming real OTP quotas. Automated tests must run using the dedicated MockOtpProvider.'
      );
    }

    // When test mode is active, never return a previously cached real provider
    if (currentProvider) {
      if (currentProvider.name !== 'mock' && !currentProvider.name.includes('mock')) {
        throw new Error(
          `Test Safety Violation: Cannot reuse cached real OTP provider "${currentProvider.name}" in test mode. ` +
            'Automated tests must run exclusively using MockOtpProvider.'
        );
      }
      return currentProvider;
    }

    currentProvider = new MockOtpProvider();
    return currentProvider;
  }

  // Non-test mode: return cached provider if available
  if (currentProvider) {
    // In production, reject cached mock provider
    if (config.nodeEnv === 'production' && currentProvider.name === 'mock') {
      throw new Error(
        'Production OTP safety violation: MockOtpProvider cannot be used in production mode.'
      );
    }
    return currentProvider;
  }

  const providerType = (config.otp.provider || 'mock').trim().toLowerCase();

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
 * Enforces test mode safety guards and production safety guards.
 */
export function setOtpProvider(provider: OtpProvider | null): void {
  if (provider) {
    // In production, strictly prohibit mock provider registration
    if (config.nodeEnv === 'production' && provider.name === 'mock') {
      throw new Error(
        'Production OTP safety violation: MockOtpProvider cannot be registered in production mode.'
      );
    }

    // In test mode, strictly prohibit registering real SMS providers
    if (isTestMode() && provider.name !== 'mock' && !provider.name.includes('mock')) {
      throw new Error(
        `Test Safety Violation: Cannot register real OTP provider "${provider.name}" in test mode. ` +
          'Automated tests must run exclusively using MockOtpProvider.'
      );
    }
  }

  currentProvider = provider;
}

export * from './otpProvider.interface.js';
export * from './mockOtpProvider.js';
