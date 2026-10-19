import {
  IsArray,
  IsEmail,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  MinLength,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { TeamStatus } from '@prisma/client';

export class RegisterDto {
  @IsOptional()
  @IsIn(['participant', 'mentor', 'judge'])
  requestedRole?: 'participant' | 'mentor' | 'judge';
  @IsString()
  @IsOptional()
  @MaxLength(120)
  name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(120)
  fullName?: string;

  @IsEmail({}, { message: 'Must be a valid email address' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  email!: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @MaxLength(128)
  password!: string;

  @IsString()
  @IsOptional()
  phone?: string;

  // Profile Information
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
}
