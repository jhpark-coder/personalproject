import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class NotificationSchedulerService {
  private readonly logger = new Logger(NotificationSchedulerService.name);

  constructor(private readonly configService: ConfigService) {}

  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async sendDailyWorkoutReminder() {
    this.skipUntilAudienceProviderExists('daily workout reminder');
  }

  @Cron('0 18 * * 0')
  async sendWeeklyReport() {
    this.skipUntilAudienceProviderExists('weekly report');
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async checkGoalAchievement() {
    this.skipUntilAudienceProviderExists('goal achievement');
  }

  @Cron('0 15 * * *')
  async sendWorkoutHabitReminder() {
    this.skipUntilAudienceProviderExists('workout habit reminder');
  }

  private skipUntilAudienceProviderExists(jobName: string) {
    if (!this.schedulerEnabled()) {
      this.logger.debug(`Notification scheduler skipped: ${jobName}.`);
      return;
    }

    this.logger.warn(
      `Notification scheduler "${jobName}" is enabled, but no production audience provider is configured.`,
    );
  }

  private schedulerEnabled() {
    return (
      this.configService.get<string>('NOTIFICATION_SCHEDULER_ENABLED') ===
        'true' || process.env.NOTIFICATION_SCHEDULER_ENABLED === 'true'
    );
  }
}
