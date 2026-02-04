import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { Vote, VoteType } from './entities/vote.entity';
import { Submission } from '../submissions/entities/submission.entity';
import { TrafficSign, SignStatus } from '../traffic-signs/entities/traffic-sign.entity';
import { User } from '../users/entities/user.entity';
import { CoinTransaction, TransactionType } from '../coins/entities/coin-transaction.entity';
import { Notification } from '../notifications/entities/notification.entity';
import { CreateVoteDto, VotingResultDto } from './dto/vote.dto';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class VotesService {
  private readonly APPROVAL_THRESHOLD = 0.70;
  private readonly REJECTION_THRESHOLD = 0.30;
  private readonly MIN_VOTES_REQUIRED = 5;

  constructor(
    @InjectRepository(Vote)
    private readonly voteRepository: Repository<Vote>,
    @InjectRepository(Submission)
    private readonly submissionRepository: Repository<Submission>,
    @InjectRepository(TrafficSign)
    private readonly trafficSignRepository: Repository<TrafficSign>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(CoinTransaction)
    private readonly coinTransactionRepository: Repository<CoinTransaction>,
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    private readonly configService: ConfigService,
  ) {}

  async createVote(userId: string, createVoteDto: CreateVoteDto): Promise<VotingResultDto> {
    const { submissionId, voteType } = createVoteDto;

    // Check if submission exists and is pending
    const submission = await this.submissionRepository.findOne({
      where: { id: submissionId },
      relations: ['user'],
    });

    if (!submission) {
      throw new NotFoundException('Submission not found');
    }

    if (submission.status !== SignStatus.PENDING) {
      throw new BadRequestException('Submission is no longer open for voting');
    }

    // Check if user is trying to vote on their own submission
    if (submission.userId === userId) {
      throw new BadRequestException('Cannot vote on your own submission');
    }

    // Check if user already voted
    const existingVote = await this.voteRepository.findOne({
      where: { submissionId, userId },
    });

    if (existingVote) {
      throw new ConflictException('You have already voted on this submission');
    }

    // Check daily vote limit for rewards
    const todayVoteCount = await this.getTodayVoteCount(userId);
    const maxDailyRewards = this.configService.get<number>('MAX_DAILY_VOTE_REWARDS', 5);
    const canEarnReward = todayVoteCount < maxDailyRewards;

    // Calculate vote weight
    const voter = await this.userRepository.findOne({ where: { id: userId } });
    if (!voter) {
      throw new NotFoundException('Voter not found');
    }
    const weight = await this.calculateVoteWeight(voter, submission);

    // Create vote
    const vote = this.voteRepository.create({
      submissionId,
      userId,
      voteType,
      weight,
    });

    await this.voteRepository.save(vote);

    // Update submission vote count
    submission.voteCount += 1;
    await this.submissionRepository.save(submission);

    // Award coins if eligible
    if (canEarnReward) {
      const voteReward = this.configService.get<number>('VOTE_REWARD', 1);
      voter.coinBalance += voteReward;
      await this.userRepository.save(voter);

      await this.coinTransactionRepository.save({
        userId,
        amount: voteReward,
        type: TransactionType.EARN,
        reason: 'Voting on submission',
        referenceId: submissionId,
      });
    }

    // Check if we should process the voting result
    await this.processVotingResult(submission);

    return this.getVotingResult(submissionId);
  }

  async getVotingResult(submissionId: string): Promise<VotingResultDto> {
    const submission = await this.submissionRepository.findOne({
      where: { id: submissionId },
    });

    if (!submission) {
      throw new NotFoundException('Submission not found');
    }

    const votes = await this.voteRepository.find({ where: { submissionId } });

    const upvotes = votes.filter((v) => v.voteType === VoteType.UPVOTE);
    const downvotes = votes.filter((v) => v.voteType === VoteType.DOWNVOTE);

    const totalWeightedUpvotes = upvotes.reduce((sum, v) => sum + Number(v.weight), 0);
    const totalWeightedDownvotes = downvotes.reduce((sum, v) => sum + Number(v.weight), 0);
    const totalWeightedVotes = totalWeightedUpvotes + totalWeightedDownvotes;

    const weightedScore = totalWeightedVotes > 0 
      ? totalWeightedUpvotes / totalWeightedVotes 
      : 0;

    const approvalPercentage = weightedScore * 100;

    let status: 'pending' | 'approved' | 'rejected' | 'review_needed' = 'pending';
    if (submission.status === SignStatus.APPROVED) {
      status = 'approved';
    } else if (submission.status === SignStatus.REJECTED) {
      status = 'rejected';
    } else if (votes.length >= this.MIN_VOTES_REQUIRED) {
      if (weightedScore >= this.APPROVAL_THRESHOLD) {
        status = 'approved';
      } else if (weightedScore <= this.REJECTION_THRESHOLD) {
        status = 'rejected';
      } else {
        status = 'review_needed';
      }
    }

    return {
      submissionId,
      totalVotes: votes.length,
      upvotes: upvotes.length,
      downvotes: downvotes.length,
      weightedScore,
      approvalPercentage,
      status,
    };
  }

  private async calculateVoteWeight(voter: User, submission: Submission): Promise<number> {
    // Weight factors (as per architecture design)
    const REPUTATION_WEIGHT = 0.4;
    const PROXIMITY_WEIGHT = 0.3;
    const EXPERTISE_WEIGHT = 0.3;

    // Reputation score (0-1)
    const reputationScore = Number(voter.reputationScore);

    // Proximity score - would need user's location (simplified for now)
    const proximityScore = 0.5; // Default middle value

    // Expertise score - based on approved submissions count
    const approvedSubmissions = await this.submissionRepository.count({
      where: {
        userId: voter.id,
        status: SignStatus.APPROVED,
      },
    });
    const expertiseScore = Math.min(approvedSubmissions / 10, 1); // Cap at 10 submissions

    const weight =
      reputationScore * REPUTATION_WEIGHT +
      proximityScore * PROXIMITY_WEIGHT +
      expertiseScore * EXPERTISE_WEIGHT;

    return Math.max(0.1, Math.min(weight, 1)); // Clamp between 0.1 and 1
  }

  private async getTodayVoteCount(userId: string): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return this.voteRepository.count({
      where: {
        userId,
        createdAt: MoreThan(today),
      },
    });
  }

  private async processVotingResult(submission: Submission): Promise<void> {
    const votes = await this.voteRepository.find({ where: { submissionId: submission.id } });
    const now = new Date();
    const deadlinePassed = now > submission.deadline;

    // Check if conditions are met
    if (votes.length < this.MIN_VOTES_REQUIRED && !deadlinePassed) {
      return; // Not enough votes and deadline not passed
    }

    const result = await this.getVotingResult(submission.id);

    // Update submission approval percentage
    submission.approvalPercentage = result.approvalPercentage;

    if (result.weightedScore >= this.APPROVAL_THRESHOLD) {
      // Auto-approve
      await this.approveSubmission(submission);
    } else if (result.weightedScore <= this.REJECTION_THRESHOLD) {
      // Auto-reject
      await this.rejectSubmission(submission);
    } else if (deadlinePassed) {
      // Flag for admin review (stays pending)
      await this.notifyAdminForReview(submission);
    }

    await this.submissionRepository.save(submission);
  }

  private async approveSubmission(submission: Submission): Promise<void> {
    submission.status = SignStatus.APPROVED;

    // Update traffic sign status
    if (submission.trafficSignId) {
      await this.trafficSignRepository.update(submission.trafficSignId, {
        status: SignStatus.APPROVED,
        approvedAt: new Date(),
      });
    }

    // Reward submitter
    const approvalReward = this.configService.get<number>('SUBMISSION_APPROVAL_REWARD', 10);
    await this.userRepository.increment({ id: submission.userId }, 'coinBalance', approvalReward);

    // Update reputation
    await this.userRepository.increment({ id: submission.userId }, 'reputationScore', 0.01);

    await this.coinTransactionRepository.save({
      userId: submission.userId,
      amount: approvalReward,
      type: TransactionType.EARN,
      reason: 'Submission approved by community',
      referenceId: submission.id,
    });

    // Notify user
    await this.notificationRepository.save({
      userId: submission.userId,
      title: 'Submission Approved! 🎉',
      message: `Your traffic sign submission has been approved. You earned ${approvalReward} TSL Coins!`,
    });
  }

  private async rejectSubmission(submission: Submission): Promise<void> {
    submission.status = SignStatus.REJECTED;

    // Update traffic sign status
    if (submission.trafficSignId) {
      await this.trafficSignRepository.update(submission.trafficSignId, {
        status: SignStatus.REJECTED,
      });
    }

    // Slight reputation decrease
    await this.userRepository.decrement({ id: submission.userId }, 'reputationScore', 0.005);

    // Notify user
    await this.notificationRepository.save({
      userId: submission.userId,
      title: 'Submission Rejected',
      message: 'Your traffic sign submission was rejected by the community. Please ensure accuracy in future submissions.',
    });
  }

  private async notifyAdminForReview(submission: Submission): Promise<void> {
    // Find all admins
    const admins = await this.userRepository.find({
      where: { role: 'admin' as any },
    });

    for (const admin of admins) {
      await this.notificationRepository.save({
        userId: admin.id,
        title: 'Submission Needs Review',
        message: `Submission ${submission.id} requires admin review. Approval score: ${submission.approvalPercentage.toFixed(1)}%`,
      });
    }
  }
}
