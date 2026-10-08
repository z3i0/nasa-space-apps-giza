import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { TeamSubmissionStatus } from '@prisma/client';

export class SearchTeamsDto {
  @IsString()
  @IsOptional()
  search?: string;

  @IsString()
  @IsOptional()
  challenge?: string;

  @IsString()
  @IsOptional()
  track?: string;

  @IsEnum(TeamSubmissionStatus)
  @IsOptional()
  submissionStatus?: TeamSubmissionStatus;

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
