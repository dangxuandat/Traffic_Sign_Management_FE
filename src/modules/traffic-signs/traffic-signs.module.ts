import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TrafficSignsController } from './traffic-signs.controller';
import { TrafficSignsService } from './traffic-signs.service';
import { TrafficSign } from './entities/traffic-sign.entity';
import { Submission } from '../submissions/entities/submission.entity';
import { User } from '../users/entities/user.entity';
import { CoinTransaction } from '../coins/entities/coin-transaction.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([TrafficSign, Submission, User, CoinTransaction]),
    AuthModule,
  ],
  controllers: [TrafficSignsController],
  providers: [TrafficSignsService],
  exports: [TrafficSignsService],
})
export class TrafficSignsModule {}
