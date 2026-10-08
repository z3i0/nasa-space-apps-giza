import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
} from 'class-validator';
import { TeamStatus } from '@prisma/client';

export class UpdateProfileDto {
  @IsString()
  @IsOptional()
  institution?: string;

  @IsString()
  @IsOptional()
  academicLevel?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  skills?: string[];

  @IsString()
  @IsOptional()
  bio?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  interests?: string[];

  @IsString()
  @IsOptional()
  experience?: string;

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
  githubUrl?: string;

  @IsString()
  @IsOptional()
  linkedinUrl?: string;

  @IsString()
  @IsOptional()
  portfolioUrl?: string;

  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;

  // Optional updates to User account fields
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  avatar?: string;
}
