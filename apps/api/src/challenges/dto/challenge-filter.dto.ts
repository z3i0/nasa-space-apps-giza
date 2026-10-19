import { IsOptional, IsString, IsEnum, IsInt } from 'class-validator';
import { Type } from 'class-transformer';
import { ChallengeDifficulty } from '@prisma/client';

export class ChallengeFilterDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  subject?: string;

  @IsOptional()
  @IsString()
  skill?: string;

  @IsOptional()
  @IsEnum(ChallengeDifficulty)
  difficulty?: ChallengeDifficulty;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  year?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  limit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  offset?: number;
}
