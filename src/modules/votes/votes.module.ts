import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VotesController } from './votes.controller';
import { VotesService } from './votes.service';
import { Vote } from './entities/vote.entity';
import { Submission } from '../submissions/entities/submission.entity';
import { TrafficSign } from '../traffic-signs/entities/traffic-sign.entity';
import { User } from '../users/entities/user.entity';
import { CoinTransaction } from '../coins/entities/coin-transaction.entity';
import { Notification } from '../notifications/entities/notification.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Vote,
      Submission,
      TrafficSign,
      User,
      CoinTransaction,
      Notification,
    ]),
    AuthModule,
  ],
  controllers: [VotesController],
  providers: [VotesService],
  exports: [VotesService],
})
export class VotesModule {}
