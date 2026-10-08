import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TeamStatus } from '@prisma/client';

export class SearchProfilesDto {
  @IsString()
  @IsOptional()
  search?: string;

  @IsString()
  @IsOptional()
  skills?: string;

  @IsString()
  @IsOptional()
  preferredChallenge?: string;

  @IsEnum(TeamStatus)
  @IsOptional()
  teamStatus?: TeamStatus;

  @IsString()
  @IsOptional()
  desiredRole?: string;

  @IsString()
  @IsOptional()
  institution?: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  @Type(() => Number)
  limit?: number = 20;
}
