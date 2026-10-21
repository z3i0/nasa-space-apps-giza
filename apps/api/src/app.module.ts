import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { AuthModule } from './auth/auth.module.js';
import { ProfileModule } from './profile/profile.module.js';
import { TeamsModule } from './teams/teams.module.js';
import { MentorshipModule } from './mentorship/mentorship.module.js';
import { ChallengesModule } from './challenges/challenges.module.js';
import { JudgingModule } from './judging/judging.module.js';
import { AccountModule } from './account/account.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env', '../../.env.local', '../../.env'],
    }),
    PrismaModule,
    AuthModule,
    ProfileModule,
    TeamsModule,
    MentorshipModule,
    ChallengesModule,
    JudgingModule,
    AccountModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
