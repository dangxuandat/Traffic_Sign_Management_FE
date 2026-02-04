import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TrafficSign, SignStatus } from './entities/traffic-sign.entity';
import { Submission, SubmissionAction } from '../submissions/entities/submission.entity';
import { User } from '../users/entities/user.entity';
import { CoinTransaction, TransactionType } from '../coins/entities/coin-transaction.entity';
import { CreateTrafficSignDto, SearchTrafficSignsDto, TrafficSignResponseDto } from './dto/traffic-sign.dto';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class TrafficSignsService {
  constructor(
    @InjectRepository(TrafficSign)
    private readonly trafficSignRepository: Repository<TrafficSign>,
    @InjectRepository(Submission)
    private readonly submissionRepository: Repository<Submission>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(CoinTransaction)
    private readonly coinTransactionRepository: Repository<CoinTransaction>,
    private readonly configService: ConfigService,
  ) {}

  async create(userId: string, createDto: CreateTrafficSignDto): Promise<TrafficSignResponseDto> {
    const submissionCost = this.configService.get<number>('SUBMISSION_COST', 5);

    // Check user's coin balance
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.coinBalance < submissionCost) {
      throw new BadRequestException(`Insufficient coins. Required: ${submissionCost}, Available: ${user.coinBalance}`);
    }

    // Create traffic sign
    const trafficSign = this.trafficSignRepository.create({
      type: createDto.type,
      label: createDto.label,
      location: {
        type: 'Point',
        coordinates: [createDto.longitude, createDto.latitude],
      },
      imageUrl: createDto.imageUrl,
      submittedById: userId,
      status: SignStatus.PENDING,
    });

    await this.trafficSignRepository.save(trafficSign);

    // Create submission record
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + 7);

    const submission = this.submissionRepository.create({
      trafficSignId: trafficSign.id,
      userId,
      action: SubmissionAction.ADD,
      description: createDto.description,
      imageUrl: createDto.imageUrl,
      status: SignStatus.PENDING,
      deadline,
    });

    await this.submissionRepository.save(submission);

    // Deduct coins
    user.coinBalance -= submissionCost;
    await this.userRepository.save(user);

    // Record transaction
    const transaction = this.coinTransactionRepository.create({
      userId,
      amount: -submissionCost,
      type: TransactionType.SPEND,
      reason: 'Traffic sign submission',
      referenceId: trafficSign.id,
    });
    await this.coinTransactionRepository.save(transaction);

    return this.toResponseDto(trafficSign);
  }

  async findAll(searchDto: SearchTrafficSignsDto): Promise<TrafficSignResponseDto[]> {
    const { latitude, longitude, radiusKm, type, page = 1, limit = 20 } = searchDto;

    let query = this.trafficSignRepository
      .createQueryBuilder('sign')
      .leftJoinAndSelect('sign.submittedBy', 'user')
      .where('sign.status = :status', { status: SignStatus.APPROVED });

    // Filter by type
    if (type) {
      query = query.andWhere('sign.type = :type', { type });
    }

    // Geospatial filter using PostGIS
    if (latitude && longitude && radiusKm) {
      query = query.andWhere(
        `ST_DWithin(
          sign.location::geography,
          ST_SetSRID(ST_MakePoint(:longitude, :latitude), 4326)::geography,
          :radius
        )`,
        { longitude, latitude, radius: radiusKm * 1000 }, // Convert km to meters
      );
    }

    // Pagination
    query = query.skip((page - 1) * limit).take(limit);

    const signs = await query.getMany();
    return signs.map((sign) => this.toResponseDto(sign));
  }

  async findOne(id: string): Promise<TrafficSignResponseDto> {
    const sign = await this.trafficSignRepository.findOne({
      where: { id },
      relations: ['submittedBy'],
    });

    if (!sign) {
      throw new NotFoundException('Traffic sign not found');
    }

    return this.toResponseDto(sign);
  }

  async findByBounds(
    minLat: number,
    minLng: number,
    maxLat: number,
    maxLng: number,
  ): Promise<TrafficSignResponseDto[]> {
    const signs = await this.trafficSignRepository
      .createQueryBuilder('sign')
      .leftJoinAndSelect('sign.submittedBy', 'user')
      .where('sign.status = :status', { status: SignStatus.APPROVED })
      .andWhere(
        `ST_Within(
          sign.location,
          ST_MakeEnvelope(:minLng, :minLat, :maxLng, :maxLat, 4326)
        )`,
        { minLng, minLat, maxLng, maxLat },
      )
      .getMany();

    return signs.map((sign) => this.toResponseDto(sign));
  }

  private toResponseDto(sign: TrafficSign): TrafficSignResponseDto {
    return {
      id: sign.id,
      type: sign.type,
      label: sign.label,
      longitude: sign.location.coordinates[0],
      latitude: sign.location.coordinates[1],
      imageUrl: sign.imageUrl,
      status: sign.status,
      submittedBy: sign.submittedBy
        ? {
            id: sign.submittedBy.id,
            displayName: sign.submittedBy.displayName,
          }
        : null,
      createdAt: sign.createdAt,
    };
  }
}
