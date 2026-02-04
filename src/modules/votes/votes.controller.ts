import { Controller, Post, Get, Body, Param, UseGuards, Request } from '@nestjs/common';
import { VotesService } from './votes.service';
import { CreateVoteDto, VotingResultDto } from './dto/vote.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('votes')
@UseGuards(JwtAuthGuard)
export class VotesController {
  constructor(private readonly votesService: VotesService) {}

  @Post()
  async createVote(
    @Request() req,
    @Body() createVoteDto: CreateVoteDto,
  ): Promise<VotingResultDto> {
    return this.votesService.createVote(req.user.sub, createVoteDto);
  }

  @Get('submission/:submissionId')
  async getVotingResult(
    @Param('submissionId') submissionId: string,
  ): Promise<VotingResultDto> {
    return this.votesService.getVotingResult(submissionId);
  }
}
