import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { AuthModule } from './auth/auth.module.js';
import { ProfileModule } from './profile/profile.module.js';
import { TeamsModule } from './teams/teams.module.js';
import { ChallengesModule } from './challenges/challenges.module.js';
import { LastSeenMiddleware } from './auth/middleware/last-seen.middleware.js';

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
    ChallengesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LastSeenMiddleware).forRoutes('{*path}');
  }
}
