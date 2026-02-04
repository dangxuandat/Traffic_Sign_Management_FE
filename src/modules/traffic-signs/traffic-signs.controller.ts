import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { TrafficSignsService } from './traffic-signs.service';
import { CreateTrafficSignDto, SearchTrafficSignsDto, TrafficSignResponseDto } from './dto/traffic-sign.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('signs')
export class TrafficSignsController {
  constructor(private readonly trafficSignsService: TrafficSignsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(
    @Request() req,
    @Body() createDto: CreateTrafficSignDto,
  ): Promise<TrafficSignResponseDto> {
    return this.trafficSignsService.create(req.user.sub, createDto);
  }

  @Get()
  async findAll(@Query() searchDto: SearchTrafficSignsDto): Promise<TrafficSignResponseDto[]> {
    return this.trafficSignsService.findAll(searchDto);
  }

  @Get('bounds')
  async findByBounds(
    @Query('minLat') minLat: number,
    @Query('minLng') minLng: number,
    @Query('maxLat') maxLat: number,
    @Query('maxLng') maxLng: number,
  ): Promise<TrafficSignResponseDto[]> {
    return this.trafficSignsService.findByBounds(minLat, minLng, maxLat, maxLng);
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<TrafficSignResponseDto> {
    return this.trafficSignsService.findOne(id);
  }
}
