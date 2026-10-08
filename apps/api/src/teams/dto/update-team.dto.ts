import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { TeamSubmissionStatus } from '@prisma/client';

export class UpdateTeamDto {
  @IsString()
  @IsOptional()
  @MaxLength(50)
  name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @IsString()
  @IsOptional()
  challenge?: string;

  @IsString()
  @IsOptional()
  track?: string;

  @IsEnum(TeamSubmissionStatus)
  @IsOptional()
  submissionStatus?: TeamSubmissionStatus;
}
