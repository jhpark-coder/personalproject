import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SmsService } from '../sms/sms.service';
import { NotificationsService } from './notifications.service';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class NotificationSchedulerService {
  private readonly logger = new Logger(NotificationSchedulerService.name);

  constructor(
    private readonly smsService: SmsService,
    private readonly notificationsService: NotificationsService,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Spring Boot에서 관리자를 제외한 모든 사용자 목록 조회
   */
  private async getAllUsersExceptAdmins(): Promise<
    Array<{ id: number; name: string; role?: string }>
  > {
    try {
      // Spring Boot 백엔드에서 사용자 목록 조회 (Docker 환경)
      const response = await firstValueFrom(
        this.httpService.get('http://backend:8080/api/users/all'),
      );

      // 관리자가 아닌 사용자만 필터링
      const users = response.data.filter(
        (user: any) => !user.role || !user.role.includes('ROLE_ADMIN'),
      );

      this.logger.log(`📋 총 ${users.length}명의 사용자에게 알림 발송 예정`);
      return users;
    } catch (error) {
      this.logger.error('❌ 사용자 목록 조회 실패:', error);
      // 실패 시 기본 테스트 사용자 반환
      return [
        { id: 1, name: '테스트 사용자 1' },
        { id: 2, name: '테스트 사용자 2' },
      ];
    }
  }

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
   */
  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async sendDailyWorkoutReminder() {
    this.logger.log('🏃‍♂️ 일일 운동 알림 스케줄러 실행');

    try {
      // 관리자를 제외한 모든 사용자 조회
      const usersToNotify = await this.getAllUsersExceptAdmins();

      for (const user of usersToNotify) {
        try {
          // 1) 사이트 알림 발송
          await this.notificationsService.createNotification({
            senderUserId: 0, // 시스템 발송
            targetUserId: user.id,
            message: '오늘도 건강한 운동으로 하루를 시작해보세요.',
            type: 'workout_reminder',
            category: 'ADMIN',
          });

          // 2) 백엔드 전일 요약/오늘 추천 호출 (실패해도 넘어감)
          try {
            const backendBase =
              this.configService.get<string>('BACKEND_BASE_URL') ||
              process.env.BACKEND_BASE_URL ||
              'http://localhost:8080';
            const dailySummaryResp = await firstValueFrom(
              this.httpService.get(
                `${backendBase}/api/internal/analytics/daily-summary`,
                {
                  params: { userId: user.id },
                  headers: {
                    'X-Internal-Api-Key': process.env.INTERNAL_API_KEY || '',
                  },
                },
              ),
            );
            const summary = dailySummaryResp.data?.summary;

            const recommendationResp = await firstValueFrom(
              this.httpService.post(
                `${backendBase}/api/internal/adaptive-workout/recommend`,
                {
                  userId: user.id,
                  targetDuration: 45,
                },
                {
                  headers: {
                    'X-Internal-Api-Key': process.env.INTERNAL_API_KEY || '',
                  },
                },
              ),
            );
            const rec = recommendationResp.data?.data?.workoutPlan;

            // 사용자 프로필에서 전화번호 조회
            const profileResp = await firstValueFrom(
              this.httpService.get(
                `${backendBase}/api/users/${user.id}/profile`,
              ),
            );
            const phoneNumber = profileResp.data?.user?.phoneNumber as
              | string
              | undefined;
            if (!phoneNumber) {
              this.logger.warn(
                `전화번호 없음으로 SMS 스킵 (userId=${user.id})`,
              );
            } else {
              // 3) SMS 본문 구성
              const lines: string[] = [];
              lines.push(`[FitMate] ${user.name}님, 오늘의 운동 안내`);
              if (summary) {
                lines.push(
                  `어제: ${summary.totalMinutes || 0}분, ${summary.totalExercises || 0}종목, 완료율 ${(summary.avgCompletionRate || 0) * 100}%`,
                );
              } else {
                lines.push('어제: 기록 없음');
              }
              if (rec?.main?.exercises?.length) {
                const names = rec.main.exercises
                  .slice(0, 3)
                  .map((e: any) => e.name)
                  .join(', ');
                lines.push(`추천: ${names} ...`);
              } else {
                lines.push('추천: 스쿼트 3x12, 푸시업 3x10, 플랭크 3x30초');
              }
              lines.push('화이팅! 💪');

              await this.smsService.sendCustomMessage(
                phoneNumber,
                lines.join('\n'),
              );
            }
          } catch (smsBuildError) {
            this.logger.warn(
              `일일 요약/추천 생성 실패 (userId=${user.id}): ${smsBuildError}`,
            );
          }

          this.logger.log(
            `✅ ${user.name} (ID: ${user.id})에게 운동 알림 발송 완료`,
          );
        } catch (userError) {
          this.logger.error(
            `❌ ${user.name} (ID: ${user.id}) 알림 발송 실패:`,
            userError,
          );
        }
      }

      this.logger.log(`🏁 일일 운동 알림 발송 완료: ${usersToNotify.length}명`);
    } catch (error) {
      this.logger.error('❌ 일일 운동 알림 발송 실패:', error);
    }
  }

  /**
   * 매주 일요일 오후 6시 주간 리포트
   */
  @Cron('0 18 * * 0') // 매주 일요일 오후 6시
  async sendWeeklyReport() {
    this.logger.log('📊 주간 리포트 스케줄러 실행');

    try {
      // 관리자를 제외한 모든 사용자 조회
      const usersToNotify = await this.getAllUsersExceptAdmins();

      for (const user of usersToNotify) {
        try {
          // 사이트 알림 발송
          await this.notificationsService.createNotification({
            senderUserId: 0, // 시스템 발송
            targetUserId: user.id,
            message: '이번 주 운동 성과를 확인해보세요!',
            type: 'weekly_report',
            category: 'ADMIN',
          });

          this.logger.log(
            `✅ ${user.name} (ID: ${user.id})에게 주간 리포트 발송 완료`,
          );
        } catch (userError) {
          this.logger.error(
            `❌ ${user.name} (ID: ${user.id}) 주간 리포트 발송 실패:`,
            userError,
          );
        }
      }

      this.logger.log(`🏁 주간 리포트 발송 완료: ${usersToNotify.length}명`);
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
      // 관리자를 제외한 모든 사용자 조회
      const usersToNotify = await this.getAllUsersExceptAdmins();

      for (const user of usersToNotify) {
        try {
          // 사이트 알림만 발송 (SMS 제외 - 비용 절약)
          await this.notificationsService.createNotification({
            senderUserId: 0, // 시스템 발송
            targetUserId: user.id,
            message: '연속 7일 운동 목표를 달성하셨습니다! 정말 대단해요! 🎉',
            type: 'goal_achievement',
            category: 'ADMIN',
          });

          this.logger.log(
            `✅ ${user.name} (ID: ${user.id})의 목표 달성 축하 알림 발송 완료`,
          );
        } catch (userError) {
          this.logger.error(
            `❌ ${user.name} (ID: ${user.id}) 목표 달성 알림 발송 실패:`,
            userError,
          );
        }
      }

      this.logger.log(`🏁 목표 달성 확인 완료: ${usersToNotify.length}명`);
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
      // 관리자를 제외한 모든 사용자 조회
      const usersToNotify = await this.getAllUsersExceptAdmins();

      for (const user of usersToNotify) {
        try {
          // 사이트 알림만 발송 (SMS 제외 - 비용 절약)
          await this.notificationsService.createNotification({
            senderUserId: 0, // 시스템 발송
            targetUserId: user.id,
            message: '오늘도 건강한 운동으로 하루를 마무리해보세요.',
            type: 'workout_habit',
            category: 'ADMIN',
          });

          this.logger.log(
            `✅ ${user.name} (ID: ${user.id})에게 운동 습관 형성 알림 발송 완료`,
          );
        } catch (userError) {
          this.logger.error(
            `❌ ${user.name} (ID: ${user.id}) 운동 습관 알림 발송 실패:`,
            userError,
          );
        }
      }

      this.logger.log(
        `🏁 운동 습관 형성 알림 발송 완료: ${usersToNotify.length}명`,
      );
    } catch (error) {
      this.logger.error('❌ 운동 습관 형성 알림 발송 실패:', error);
    }
  }
}
