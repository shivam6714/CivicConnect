/**
 * Interface definition for OTP Delivery Providers.
 * Allows pluggable integration of different SMS gateways (e.g. CDAC, Fast2SMS, Twilio)
 * or isolated Mock providers for development and testing.
 */

export interface SendOtpOptions {
  /**
   * Normalized recipient phone number in E.164 format (+91XXXXXXXXXX)
   */
  recipient: string;

  /**
   * One-time passcode generated cryptographically by the auth service
   */
  otp: string;

  /**
   * Validity duration in minutes
   */
  expiryMinutes: number;

  /**
   * Optional custom template or message body
   */
  message?: string;
}

export interface SendOtpResult {
  success: boolean;
  messageId: string;
  provider: string;
  timestamp: Date;
  details?: Record<string, unknown>;
}

export interface OtpProvider {
  /**
   * Unique identifier of the provider (e.g. 'mock', 'twilio', 'fast2sms')
   */
  readonly name: string;

  /**
   * Dispatches the OTP to the recipient
   */
  sendOtp(options: SendOtpOptions): Promise<SendOtpResult>;
}
