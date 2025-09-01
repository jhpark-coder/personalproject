import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as twilio from 'twilio';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class SmsService implements OnModuleInit {
  private client: twilio.Twilio;

  constructor(
    private configService: ConfigService,
    private redisService: RedisService,
  ) {}

  async onModuleInit() {
    // 모듈 초기화 후 Twilio 클라이언트 초기화
    this.initializeTwilioClient();
  }

  private initializeTwilioClient() {
    try {
      // 디버깅을 위한 환경 정보 출력
      console.log('=== 환경 변수 디버깅 ===');
      console.log('NODE_ENV:', process.env.NODE_ENV);
      console.log('현재 작업 디렉토리:', process.cwd());
      console.log(
        '모든 TWILIO 관련 환경 변수:',
        Object.keys(process.env).filter((key) => key.includes('TWILIO')),
      );
      console.log('직접 process.env 접근:');
      console.log('  TWILIO_ACCOUNT_SID:', process.env.TWILIO_ACCOUNT_SID);
      console.log('  TWILIO_AUTH_TOKEN:', process.env.TWILIO_AUTH_TOKEN);
      console.log('  TWILIO_PHONE_NUMBER:', process.env.TWILIO_PHONE_NUMBER);

      // ConfigService를 통해 환경 변수 가져오기
      const accountSid =
        this.configService.get<string>('TWILIO_ACCOUNT_SID') ||
        this.configService.get<string>('development.twilio.accountSid');
      const authToken =
        this.configService.get<string>('TWILIO_AUTH_TOKEN') ||
        this.configService.get<string>('development.twilio.authToken');
      const phoneNumber =
        this.configService.get<string>('TWILIO_PHONE_NUMBER') ||
        this.configService.get<string>('development.twilio.phoneNumber');

      console.log('=== Twilio 초기화 시작 ===');
      console.log(
        'Twilio Account SID:',
        accountSid ? `${accountSid.substring(0, 10)}...` : 'undefined',
      );
      console.log(
        'Twilio Auth Token:',
        authToken ? '***설정됨***' : 'undefined',
      );
      console.log('Twilio Phone Number:', phoneNumber);

      // 디버깅을 위한 환경 변수 체크
      console.log(
        'Available env vars:',
        Object.keys(process.env).filter((key) => key.includes('TWILIO')),
      );
      console.log('ConfigService TWILIO vars:', {
        accountSid: !!this.configService.get('TWILIO_ACCOUNT_SID'),
        authToken: !!this.configService.get('TWILIO_AUTH_TOKEN'),
        phoneNumber: !!this.configService.get('TWILIO_PHONE_NUMBER'),
      });

      if (accountSid && authToken) {
        this.client = twilio(accountSid, authToken);
        console.log('✅ Twilio client initialized successfully');
      } else {
        console.error(
          '❌ Twilio credentials not found in environment variables',
        );
        console.error(
          'Please check your .env.development file and ensure TWILIO_* variables are set',
        );
      }
    } catch (error) {
      console.error('❌ Failed to initialize Twilio client:', error);
    }
  }

  /**
   * SMS 발송
   */
  async sendSms(to: string, message: string): Promise<boolean> {
    try {
      // 개발 환경에서 Mock SMS 모드
      const isDevelopment = this.configService.get<string>('NODE_ENV') === 'development';
      const useMockSms = this.configService.get<string>('USE_MOCK_SMS') === 'true';
      
      if (isDevelopment && useMockSms) {
        console.log('===========================================');
        console.log('📱 [MOCK SMS - 개발 모드]');
        console.log('수신번호:', to);
        console.log('메시지 내용:', message);
        
        // OTP 코드 추출해서 보여주기
        const otpMatch = message.match(/\d{6}/);
        if (otpMatch) {
          console.log('🔑 인증코드: ', otpMatch[0]);
          console.log('(개발 환경: 실제 SMS는 발송되지 않습니다)');
        }
        console.log('===========================================');
        return true;
      }

      if (!this.client) {
        console.error('❌ Twilio client not initialized');
        return false;
      }

      const from =
        this.configService.get<string>('TWILIO_PHONE_NUMBER') ||
        this.configService.get<string>('development.twilio.phoneNumber');

      if (!from) {
        console.error('❌ Twilio phone number not configured');
        return false;
      }

      console.log('📱 Sending SMS:', { to, from, message });

      const result = await this.client.messages.create({
        body: message,
        from: from,
        to: to,
      });

      console.log('✅ SMS sent successfully:', result.sid);
      return true;
    } catch (error) {
      console.error('❌ SMS sending failed:', error);
      // Trial 계정 에러 처리
      if (error.code === 21608) {
        console.error('⚠️ Twilio Trial 계정 제한: 인증된 번호로만 발송 가능합니다.');
        console.error('해결방법: twilio.com/console에서 번호 인증 또는 USE_MOCK_SMS=true 설정');
      }
      return false;
    }
  }

  /**
   * 운동 추천 SMS 발송
   */
  async sendWorkoutRecommendation(
    to: string,
    workout: string,
  ): Promise<boolean> {
    const message = `[FitMate] 오늘 추천운동은 ${workout}입니다! 함께 운동해요 💪`;
    return this.sendSms(to, message);
  }

  /**
   * 맞춤형 메시지 발송
   */
  async sendCustomMessage(to: string, message: string): Promise<boolean> {
    const formattedMessage = `[FitMate] ${message}`;
    return this.sendSms(to, message);
  }

  /**
   * 6자리 OTP 생성
   */
  private generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * OTP 인증 코드 요청
   */
  async requestOtp(
    phone: string,
  ): Promise<{ success: boolean; message?: string }> {
    try {
      // Redis 레이트 리밋 체크
      const rateLimitCheck = await this.redisService.checkRateLimit(phone);
      if (!rateLimitCheck.allowed) {
        const remainingMinutes = Math.ceil(
          (rateLimitCheck.remainingTime || 0) / 60,
        );
        return {
          success: false,
          message: `요청이 너무 많습니다. ${remainingMinutes}분 후 다시 시도해주세요.`,
        };
      }

      // OTP 생성
      const otp = this.generateOtp();
      const otpConfig = this.configService.get('redis.otp');

      // Redis에 OTP 저장
      await this.redisService.setOtp(phone, otp, otpConfig.ttl);

      // 레이트 리밋 증가
      await this.redisService.incrementRateLimit(
        phone,
        otpConfig.rateLimitWindow,
      );

      // SMS 발송
      const message = `[FitMate] 인증번호: ${otp}`;
      const smsResult = await this.sendSms(phone, message);

      if (smsResult) {
        console.log(`✅ OTP sent to ${phone}: ${otp}`);
        return { success: true, message: '인증 코드가 발송되었습니다.' };
      } else {
        // SMS 발송 실패 시 OTP 삭제
        await this.redisService.deleteOtp(phone);
        return { success: false, message: 'SMS 발송에 실패했습니다.' };
      }
    } catch (error) {
      console.error('❌ OTP request failed:', error);
      return {
        success: false,
        message: '인증 코드 발송 중 오류가 발생했습니다.',
      };
    }
  }

  /**
   * OTP 인증 코드 확인
   */
  async verifyOtp(
    phone: string,
    code: string,
  ): Promise<{ success: boolean; message?: string }> {
    try {
      // Redis에서 OTP 조회
      const storedOtp = await this.redisService.getOtp(phone);

      if (!storedOtp) {
        return {
          success: false,
          message: '인증 코드가 만료되었습니다. 다시 요청해주세요.',
        };
      }

      // 코드 확인
      if (storedOtp !== code) {
        return { success: false, message: '인증 코드가 올바르지 않습니다.' };
      }

      // 성공 시 OTP 삭제
      await this.redisService.deleteOtp(phone);

      console.log(`✅ OTP verified for ${phone}`);
      return { success: true, message: '인증이 완료되었습니다.' };
    } catch (error) {
      console.error('❌ OTP verification failed:', error);
      return {
        success: false,
        message: '인증 코드 확인 중 오류가 발생했습니다.',
      };
    }
  }

  /**
   * 만료된 OTP 정리 (정기적으로 호출)
   */
  async cleanupExpiredOtps(): Promise<number> {
    return await this.redisService.cleanupExpiredKeys();
  }
}
