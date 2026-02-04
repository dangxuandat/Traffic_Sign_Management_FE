import { IsEnum, IsNotEmpty, IsOptional, IsNumber, IsString, MaxLength } from 'class-validator';
import { SignType } from '../entities/traffic-sign.entity';

export class CreateTrafficSignDto {
  @IsEnum(SignType)
  @IsNotEmpty()
  type: SignType;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  label: string;

  @IsNumber()
  longitude: number;

  @IsNumber()
  latitude: number;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;
}

export class UpdateTrafficSignDto {
  @IsOptional()
  @IsEnum(SignType)
  type?: SignType;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  label?: string;

  @IsOptional()
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsString()
  imageUrl?: string;
}

export class SearchTrafficSignsDto {
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @IsNumber()
  radiusKm?: number;

  @IsOptional()
  @IsEnum(SignType)
  type?: SignType;

  @IsOptional()
  @IsNumber()
  page?: number;

  @IsOptional()
  @IsNumber()
  limit?: number;
}

export class TrafficSignResponseDto {
  id: string;
  type: SignType;
  label: string;
  longitude: number;
  latitude: number;
  imageUrl: string | null;
  status: string;
  submittedBy: {
    id: string;
    displayName: string;
  } | null;
  createdAt: Date;
}
