import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';

// Modules
import { AuthModule } from './modules/auth/auth.module';
import { TrafficSignsModule } from './modules/traffic-signs/traffic-signs.module';
import { VotesModule } from './modules/votes/votes.module';

// Entities
import { User } from './modules/users/entities/user.entity';
import { TrafficSign } from './modules/traffic-signs/entities/traffic-sign.entity';
import { Submission } from './modules/submissions/entities/submission.entity';
import { Vote } from './modules/votes/entities/vote.entity';
import { CoinTransaction } from './modules/coins/entities/coin-transaction.entity';
import { Notification } from './modules/notifications/entities/notification.entity';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Database
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        url: configService.get<string>('DATABASE_URL'),
        entities: [User, TrafficSign, Submission, Vote, CoinTransaction, Notification],
        synchronize: configService.get<string>('NODE_ENV') === 'development',
        logging: configService.get<string>('NODE_ENV') === 'development',
        ssl:
          configService.get<string>('NODE_ENV') === 'production'
            ? { rejectUnauthorized: false }
            : false,
      }),
      inject: [ConfigService],
    }),

    // Rate Limiting
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => [
        {
          ttl: configService.get<number>('THROTTLE_TTL', 60) * 1000,
          limit: configService.get<number>('THROTTLE_LIMIT', 100),
        },
      ],
      inject: [ConfigService],
    }),

    // Feature Modules
    AuthModule,
    TrafficSignsModule,
    VotesModule,
  ],
})
export class AppModule {}
