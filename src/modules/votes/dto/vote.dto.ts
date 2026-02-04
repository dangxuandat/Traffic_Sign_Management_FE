import { IsEnum, IsUUID } from 'class-validator';
import { VoteType } from '../entities/vote.entity';

export class CreateVoteDto {
  @IsUUID()
  submissionId: string;

  @IsEnum(VoteType)
  voteType: VoteType;
}

export class VoteResponseDto {
  id: string;
  submissionId: string;
  userId: string;
  voteType: VoteType;
  weight: number;
  createdAt: Date;
}

export class VotingResultDto {
  submissionId: string;
  totalVotes: number;
  upvotes: number;
  downvotes: number;
  weightedScore: number;
  approvalPercentage: number;
  status: 'pending' | 'approved' | 'rejected' | 'review_needed';
}
