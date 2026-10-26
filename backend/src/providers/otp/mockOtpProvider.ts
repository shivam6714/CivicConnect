import type { OtpProvider, SendOtpOptions, SendOtpResult } from './otpProvider.interface.js';
import { maskPhoneNumber } from '../../utils/phone.js';
import { config } from '../../config/index.js';

interface MockStoredMessage {
  recipient: string;
  otp: string;
  expiryMinutes: number;
  sentAt: Date;
}

/**
 * Isolated Mock OTP Provider for local development and test automation.
 *
 * Security guarantees:
 * - Strictly prohibited in production environments (throws immediately on instantiation).
 * - Does NOT hardcode a universal static OTP like '123456'.
 * - Masks recipient phone numbers in console logs.
 * - Stores delivered OTPs in memory for test assertions; test lookup is disabled in production.
 */
export class MockOtpProvider implements OtpProvider {
  public readonly name = 'mock';
  private sentMessages: Map<string, MockStoredMessage[]> = new Map();
  private fixedOtpForTest: string | null = null;

  constructor() {
    if (config.nodeEnv === 'production') {
      throw new Error(
        'Production OTP safety violation: MockOtpProvider cannot be instantiated in production mode. ' +
          'Configure a real SMS gateway provider for production deployments.'
      );
    }
  }

  /**
   * Configures a predictable OTP for deterministic test scenarios.
   * Strictly prohibited in production environments.
   */
  setPredictableOtpForTest(otp: string | null): void {
    const isProduction =
      config.nodeEnv === 'production' ||
      process.env.NODE_ENV === 'production' ||
      process.env.APP_ENV === 'production';

    const isTestMode =
      config.nodeEnv === 'test' ||
      process.env.NODE_ENV === 'test' ||
      process.env.CIVICCONNECT_TEST_MODE === 'true';

    if (isProduction || !isTestMode) {
      throw new Error(
        'Production OTP safety violation: Predictable test OTPs cannot be configured in production mode or outside isolated test environments.'
      );
    }
    this.fixedOtpForTest = otp;
  }

  getPredictableOtpForTest(): string | null {
    return this.fixedOtpForTest;
  }

  async sendOtp(options: SendOtpOptions): Promise<SendOtpResult> {
    if (config.nodeEnv === 'production') {
      throw new Error('Production OTP safety violation: Attempted to send mock OTP in production mode.');
    }

    const effectiveOtp = this.fixedOtpForTest || options.otp;
    const masked = maskPhoneNumber(options.recipient);
    const messageId = `mock-msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const messageRecord: MockStoredMessage = {
      recipient: options.recipient,
      otp: effectiveOtp,
      expiryMinutes: options.expiryMinutes,
      sentAt: new Date(),
    };

    const existing = this.sentMessages.get(options.recipient) || [];
    existing.push(messageRecord);
    this.sentMessages.set(options.recipient, existing);

    // In development mode, display the generated OTP in the local server terminal for manual developer testing.
    // Strictly prohibited in production and omitted in test mode.
    const isTestMode =
      config.nodeEnv === 'test' ||
      process.env.CIVICCONNECT_TEST_MODE === 'true' ||
      (config.nodeEnv !== 'development' && process.env.NODE_ENV === 'test');

    if (config.nodeEnv === 'development' && !isTestMode) {
      console.log(
        `[MockOtpProvider] [DEVELOPMENT ONLY] Generated OTP for ${masked}: ${effectiveOtp} (valid for ${options.expiryMinutes}m, messageId: ${messageId})`
      );
    }

    return {
      success: true,
      messageId,
      provider: this.name,
      timestamp: new Date(),
      details: {
        recipientMasked: masked,
        validityMinutes: options.expiryMinutes,
      },
    };
  }

  /**
   * Test helper method to retrieve the last sent OTP for a given recipient.
   * Throws an error in production to avoid accidental exposure.
   */
  getLastSentOtpForTest(recipient: string): string | null {
    if (config.nodeEnv === 'production') {
      throw new Error('Test OTP inspection is strictly disabled in production environment');
    }

    const messages = this.sentMessages.get(recipient);
    if (!messages || messages.length === 0) return null;
    return messages[messages.length - 1].otp;
  }

  /**
   * Clears in-memory message history (for test isolation).
   */
  clearHistory(): void {
    this.sentMessages.clear();
    this.fixedOtpForTest = null;
  }
}
