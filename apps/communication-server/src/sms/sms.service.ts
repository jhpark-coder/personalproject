import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as twilio from 'twilio';
import { RedisService } from '../shared/redis/redis.service';

@Injectable()
export class SmsService implements OnModuleInit {
  private readonly logger = new Logger(SmsService.name);
  private client?: twilio.Twilio;

  constructor(
    private configService: ConfigService,
    private redisService: RedisService,
  ) {}

  async onModuleInit() {
    this.initializeTwilioClient();
  }

  private initializeTwilioClient() {
    try {
      const accountSid =
        this.configService.get<string>('TWILIO_ACCOUNT_SID') ||
        this.configService.get<string>('development.twilio.accountSid');
      const authToken =
        this.configService.get<string>('TWILIO_AUTH_TOKEN') ||
        this.configService.get<string>('development.twilio.authToken');
      const phoneNumber =
        this.configService.get<string>('TWILIO_PHONE_NUMBER') ||
        this.configService.get<string>('development.twilio.phoneNumber');

      this.logger.log(
        `Twilio configuration: accountSid=${Boolean(accountSid)}, authToken=${Boolean(authToken)}, phoneNumber=${Boolean(phoneNumber)}`,
      );

      if (!accountSid || !authToken) {
        this.logger.warn('Twilio credentials are not configured.');
        return;
      }

      this.client = twilio(accountSid, authToken);
      this.logger.log('Twilio client initialized.');
    } catch (error) {
      this.logger.error(
        'Failed to initialize Twilio client.',
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  async sendSms(to: string, message: string): Promise<boolean> {
    try {
      if (!this.client) {
        this.logger.error('Twilio client is not initialized.');
        return false;
      }

      const from =
        this.configService.get<string>('TWILIO_PHONE_NUMBER') ||
        this.configService.get<string>('development.twilio.phoneNumber');

      if (!from) {
        this.logger.error('Twilio phone number is not configured.');
        return false;
      }

      this.logger.log(
        `Sending SMS: to=${this.maskPhone(to)}, from=${this.maskPhone(from)}, messageLength=${message.length}`,
      );

      const result = await this.client.messages.create({
        body: message,
        from,
        to,
      });

      this.logger.log(
        `SMS sent successfully: sidReceived=${Boolean(result.sid)}`,
      );
      return true;
    } catch (error) {
      this.logger.error(
        'SMS sending failed.',
        error instanceof Error ? error.stack : undefined,
      );
      return false;
    }
  }

  async sendWorkoutRecommendation(
    to: string,
    workout: string,
  ): Promise<boolean> {
    const message = `[FitMate] Today workout recommendation: ${workout}`;
    return this.sendSms(to, message);
  }

  async sendCustomMessage(to: string, message: string): Promise<boolean> {
    const formattedMessage = `[FitMate] ${message}`;
    return this.sendSms(to, formattedMessage);
  }

  private generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  async requestOtp(
    phone: string,
  ): Promise<{ success: boolean; message?: string }> {
    try {
      const rateLimitCheck = await this.redisService.checkRateLimit(phone);
      if (!rateLimitCheck.allowed) {
        const remainingMinutes = Math.ceil(
          (rateLimitCheck.remainingTime || 0) / 60,
        );
        return {
          success: false,
          message: `Too many requests. Try again in ${remainingMinutes} minutes.`,
        };
      }

      const otp = this.generateOtp();
      const otpConfig = this.configService.get<{
        ttl: number;
        rateLimitWindow: number;
      }>('redis.otp') ?? { ttl: 300, rateLimitWindow: 3600 };

      await this.redisService.setOtp(phone, otp, otpConfig.ttl);
      await this.redisService.incrementRateLimit(
        phone,
        otpConfig.rateLimitWindow,
      );

      const smsResult = await this.sendSms(
        phone,
        `[FitMate] Verification code: ${otp}`,
      );

      if (smsResult) {
        this.logger.log(`OTP sent: phone=${this.maskPhone(phone)}`);
        return { success: true, message: 'Verification code sent.' };
      }

      await this.redisService.deleteOtp(phone);
      return { success: false, message: 'SMS sending failed.' };
    } catch (error) {
      this.logger.error(
        'OTP request failed.',
        error instanceof Error ? error.stack : undefined,
      );
      return {
        success: false,
        message: 'Failed to send verification code.',
      };
    }
  }

  async verifyOtp(
    phone: string,
    code: string,
  ): Promise<{ success: boolean; message?: string }> {
    try {
      const storedOtp = await this.redisService.getOtp(phone);

      if (!storedOtp) {
        return {
          success: false,
          message: 'Verification code expired. Request a new code.',
        };
      }

      if (storedOtp !== code) {
        return { success: false, message: 'Invalid verification code.' };
      }

      await this.redisService.deleteOtp(phone);

      this.logger.log(`OTP verified: phone=${this.maskPhone(phone)}`);
      return { success: true, message: 'Verification completed.' };
    } catch (error) {
      this.logger.error(
        'OTP verification failed.',
        error instanceof Error ? error.stack : undefined,
      );
      return {
        success: false,
        message: 'Failed to verify code.',
      };
    }
  }

  async cleanupExpiredOtps(): Promise<number> {
    return this.redisService.cleanupExpiredKeys();
  }

  private maskPhone(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    if (digits.length <= 4) {
      return '***';
    }
    return `***${digits.slice(-4)}`;
  }
}
