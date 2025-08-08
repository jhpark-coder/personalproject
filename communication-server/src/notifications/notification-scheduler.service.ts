import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SmsService } from '../sms/sms.service';
import { NotificationsService } from './notifications.service';

@Injectable()
export class NotificationSchedulerService {
  private readonly logger = new Logger(NotificationSchedulerService.name);

  constructor(
    private readonly smsService: SmsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * 테스트용 SMS - 매일 2시 18분에 발송 (테스트용)
   * TODO: 무료 토큰 제한으로 인해 주석처리됨 - 나중에 풀어야 함
   */
  // @Cron('18 14 * * *') // 매일 오후 2시 18분
  // async sendTestSms() {
  //   this.logger.log('🧪 테스트 SMS 스케줄러 실행');
    
  //   try {
  //     const testUser = {
  //       phoneNumber: '+821026238769',
  //       name: '테스트 사용자'
  //     };

  //     // 테스트 SMS 발송
  //     await this.smsService.sendCustomMessage(
  //       testUser.phoneNumber,
  //       `안녕하세요! FitMate 테스트 SMS입니다. 오늘도 화이팅! 💪`
  //     );

  //     this.logger.log(`✅ ${testUser.name}에게 테스트 SMS 발송 완료`);
  //   } catch (error) {
  //     this.logger.error('❌ 테스트 SMS 발송 실패:', error);
  //   }
  // }

  /**
   * 매일 오전 9시 운동 알림
   * TODO: 무료 토큰 제한으로 인해 SMS 발송 부분 주석처리됨 - 나중에 풀어야 함
   */
  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async sendDailyWorkoutReminder() {
    this.logger.log('🏃‍♂️ 일일 운동 알림 스케줄러 실행');
    
    try {
      // TODO: 실제 사용자 데이터베이스에서 운동 알림을 받을 사용자들 조회
      const usersToNotify = [
        { userId: 1, phoneNumber: '+821026238769', name: '테스트 사용자' },
        // 실제로는 데이터베이스에서 조회
      ];

      for (const user of usersToNotify) {
        // TODO: 무료 토큰 제한으로 인해 SMS 발송 주석처리 - 나중에 풀어야 함
        // SMS 알림 발송
        // await this.smsService.sendCustomMessage(
        //   user.phoneNumber,
        //   `안녕하세요 ${user.name}! 오늘도 운동으로 건강한 하루를 시작해보세요! 💪`
        // );

        // 사이트 알림 발송
        await this.notificationsService.createNotification({
          senderUserId: 0, // 시스템 발송
          targetUserId: user.userId,
          message: '오늘도 건강한 운동으로 하루를 시작해보세요.',
          type: 'workout_reminder',
          category: 'ADMIN',
        });

        this.logger.log(`✅ ${user.name}에게 운동 알림 발송 완료 (사이트 알림만)`);
      }
    } catch (error) {
      this.logger.error('❌ 일일 운동 알림 발송 실패:', error);
    }
  }

  /**
   * 매주 일요일 오후 6시 주간 리포트
   * TODO: 무료 토큰 제한으로 인해 SMS 발송 부분 주석처리됨 - 나중에 풀어야 함
   */
  @Cron('0 18 * * 0') // 매주 일요일 오후 6시
  async sendWeeklyReport() {
    this.logger.log('📊 주간 리포트 스케줄러 실행');
    
    try {
      // TODO: 실제 사용자 데이터베이스에서 주간 리포트를 받을 사용자들 조회
      const usersToNotify = [
        { userId: 1, phoneNumber: '+821026238769', name: '테스트 사용자' },
        // 실제로는 데이터베이스에서 조회
      ];

      for (const user of usersToNotify) {
        // TODO: 무료 토큰 제한으로 인해 SMS 발송 주석처리 - 나중에 풀어야 함
        // SMS 알림 발송
        // await this.smsService.sendCustomMessage(
        //   user.phoneNumber,
        //   `${user.name}님의 이번 주 운동 리포트가 준비되었습니다! 앱에서 확인해보세요 📱`
        // );

        // 사이트 알림 발송
        await this.notificationsService.createNotification({
          senderUserId: 0, // 시스템 발송
          targetUserId: user.userId,
          message: '이번 주 운동 성과를 확인해보세요!',
          type: 'weekly_report',
          category: 'ADMIN',
        });

        this.logger.log(`✅ ${user.name}에게 주간 리포트 발송 완료 (사이트 알림만)`);
      }
    } catch (error) {
      this.logger.error('❌ 주간 리포트 발송 실패:', error);
    }
  }

  /**
   * 매일 자정 목표 달성 확인 (사이트 알림만)
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async checkGoalAchievement() {
    this.logger.log('🎯 목표 달성 확인 스케줄러 실행');
    
    try {
      // TODO: 실제 사용자 데이터베이스에서 목표 달성한 사용자들 조회
      const usersWithGoals = [
        { userId: 1, name: '테스트 사용자', goal: '연속 7일 운동' },
        // 실제로는 데이터베이스에서 조회
      ];

      for (const user of usersWithGoals) {
        // 사이트 알림만 발송 (SMS 제외 - 비용 절약)
        await this.notificationsService.createNotification({
          senderUserId: 0, // 시스템 발송
          targetUserId: user.userId,
          message: `${user.goal} 목표를 달성하셨습니다! 정말 대단해요! 🎉`,
          type: 'goal_achievement',
          category: 'ADMIN',
        });

        this.logger.log(`✅ ${user.name}의 목표 달성 축하 알림 발송 완료 (사이트 알림만)`);
      }
    } catch (error) {
      this.logger.error('❌ 목표 달성 확인 실패:', error);
    }
  }

  /**
   * 매일 오후 3시 운동 습관 형성 알림 (사이트 알림만)
   */
  @Cron('0 15 * * *') // 매일 오후 3시
  async sendWorkoutHabitReminder() {
    this.logger.log('💪 운동 습관 형성 알림 스케줄러 실행');
    
    try {
      // TODO: 실제 사용자 데이터베이스에서 운동을 안 한 사용자들 조회
      const inactiveUsers = [
        { userId: 1, name: '테스트 사용자' },
        // 실제로는 데이터베이스에서 조회
      ];

      for (const user of inactiveUsers) {
        // 사이트 알림만 발송 (SMS 제외 - 비용 절약)
        await this.notificationsService.createNotification({
          senderUserId: 0, // 시스템 발송
          targetUserId: user.userId,
          message: '오늘도 건강한 운동으로 하루를 마무리해보세요.',
          type: 'workout_habit',
          category: 'ADMIN',
        });

        this.logger.log(`✅ ${user.name}에게 운동 습관 형성 알림 발송 완료 (사이트 알림만)`);
      }
    } catch (error) {
      this.logger.error('❌ 운동 습관 형성 알림 발송 실패:', error);
    }
  }
} 