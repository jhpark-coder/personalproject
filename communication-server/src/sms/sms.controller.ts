import {
  Controller,
  Post,
  Body,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { SmsService } from './sms.service';

@Controller('sms')
export class SmsController {
  constructor(private readonly smsService: SmsService) {}

  /**
   * 기본 SMS 발송
   */
  @Post('send')
  async sendSms(@Body() body: { to: string; message: string }) {
    try {
      const { to, message } = body;

      if (!to || !message) {
        throw new HttpException(
          '전화번호와 메시지가 필요합니다.',
          HttpStatus.BAD_REQUEST,
        );
      }

      const result = await this.smsService.sendSms(to, message);

      if (result) {
        return { success: true, message: 'SMS가 성공적으로 발송되었습니다.' };
      } else {
        throw new HttpException(
          'SMS 발송에 실패했습니다.',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    } catch (error) {
      throw new HttpException(
        error.message || 'SMS 발송 중 오류가 발생했습니다.',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 운동 추천 SMS 발송
   */
  @Post('workout-recommendation')
  async sendWorkoutRecommendation(
    @Body() body: { to: string; workout: string },
  ) {
    try {
      const { to, workout } = body;

      if (!to || !workout) {
        throw new HttpException(
          '전화번호와 운동 정보가 필요합니다.',
          HttpStatus.BAD_REQUEST,
        );
      }

      const result = await this.smsService.sendWorkoutRecommendation(
        to,
        workout,
      );

      if (result) {
        return {
          success: true,
          message: '운동 추천 SMS가 성공적으로 발송되었습니다.',
        };
      } else {
        throw new HttpException(
          '운동 추천 SMS 발송에 실패했습니다.',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    } catch (error) {
      throw new HttpException(
        error.message || '운동 추천 SMS 발송 중 오류가 발생했습니다.',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 맞춤형 메시지 발송
   */
  @Post('custom')
  async sendCustomMessage(@Body() body: { to: string; message: string }) {
    try {
      const { to, message } = body;

      if (!to || !message) {
        throw new HttpException(
          '전화번호와 메시지가 필요합니다.',
          HttpStatus.BAD_REQUEST,
        );
      }

      const result = await this.smsService.sendCustomMessage(to, message);

      if (result) {
        return {
          success: true,
          message: '맞춤형 SMS가 성공적으로 발송되었습니다.',
        };
      } else {
        throw new HttpException(
          '맞춤형 SMS 발송에 실패했습니다.',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    } catch (error) {
      throw new HttpException(
        error.message || '맞춤형 SMS 발송 중 오류가 발생했습니다.',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * SMS 서비스 상태 확인
   */
  @Post('health')
  async healthCheck() {
    return {
      success: true,
      message: 'SMS 서비스가 정상적으로 작동 중입니다.',
      timestamp: new Date(Date.now() + (9 * 60 * 60 * 1000)).toISOString(),
    };
  }

  /**
   * OTP 인증 코드 요청
   */
  @Post('request-otp')
  async requestOtp(@Body() body: { phone: string }) {
    try {
      const { phone } = body;

      if (!phone) {
        throw new HttpException(
          '전화번호가 필요합니다.',
          HttpStatus.BAD_REQUEST,
        );
      }

      const result = await this.smsService.requestOtp(phone);

      if (result.success) {
        return {
          success: true,
          message: '인증 코드가 발송되었습니다.',
          expiresIn: 300, // 5분
        };
      } else {
        throw new HttpException(
          result.message || '인증 코드 발송에 실패했습니다.',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    } catch (error) {
      throw new HttpException(
        error.message || '인증 코드 발송 중 오류가 발생했습니다.',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * OTP 인증 코드 확인
   */
  @Post('verify-otp')
  async verifyOtp(@Body() body: { phone: string; code: string }) {
    try {
      const { phone, code } = body;

      if (!phone || !code) {
        throw new HttpException(
          '전화번호와 인증 코드가 필요합니다.',
          HttpStatus.BAD_REQUEST,
        );
      }

      const result = await this.smsService.verifyOtp(phone, code);

      if (result.success) {
        return {
          success: true,
          message: '인증이 완료되었습니다.',
          verified: true,
        };
      } else {
        throw new HttpException(
          result.message || '인증 코드가 올바르지 않습니다.',
          HttpStatus.BAD_REQUEST,
        );
      }
    } catch (error) {
      throw new HttpException(
        error.message || '인증 코드 확인 중 오류가 발생했습니다.',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
