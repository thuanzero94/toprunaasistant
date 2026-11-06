import { Module } from '@nestjs/common';
import { ApiController } from './controllers/api.controller';
import { TopRunEngineService } from './services/toprun-engine.service';
import { AccountService } from './services/account.service';
import { MailService } from './services/mail.service';
import { StravaPoolLimiterService } from './services/strava-pool-limiter.service';

@Module({
  imports: [],
  controllers: [ApiController],
  providers: [TopRunEngineService, AccountService, MailService, StravaPoolLimiterService],
})
export class AppModule {}
