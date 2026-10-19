import { IsString, IsNotEmpty, IsOptional, IsEnum, IsInt, IsArray, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { ChallengeDifficulty } from '@prisma/client';

export class CreateChallengeDto {
  @IsString()
  @IsNotEmpty()
  slug!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  year?: number;

  @IsString()
  @IsNotEmpty()
  titleEn!: string;

  @IsString()
  @IsNotEmpty()
  titleAr!: string;

  @IsOptional()
  @IsString()
  taglineEn?: string;

  @IsOptional()
  @IsString()
  taglineAr?: string;

  @IsString()
  @IsNotEmpty()
  descriptionEn!: string;

  @IsString()
  @IsNotEmpty()
  descriptionAr!: string;

  @IsOptional()
  @IsString()
  requirementsEn?: string;

  @IsOptional()
  @IsString()
  requirementsAr?: string;

  @IsOptional()
  @IsString()
  deliverablesEn?: string;

  @IsOptional()
  @IsString()
  deliverablesAr?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  subjects?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  recommendedSkills?: string[];

  @IsOptional()
  @IsEnum(ChallengeDifficulty)
  difficulty?: ChallengeDifficulty;

  @IsOptional()
  @IsString()
  nasaOriginalUrl?: string;

  @IsOptional()
  @IsString()
  nasaChallengeId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  displayOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateChallengeDto {
  @IsOptional()
  @IsString()
  titleEn?: string;

  @IsOptional()
  @IsString()
  titleAr?: string;

  @IsOptional()
  @IsString()
  taglineEn?: string;

  @IsOptional()
  @IsString()
  taglineAr?: string;

  @IsOptional()
  @IsString()
  descriptionEn?: string;

  @IsOptional()
  @IsString()
  descriptionAr?: string;

  @IsOptional()
  @IsString()
  requirementsEn?: string;

  @IsOptional()
  @IsString()
  requirementsAr?: string;

  @IsOptional()
  @IsString()
  deliverablesEn?: string;

  @IsOptional()
  @IsString()
  deliverablesAr?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  subjects?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  recommendedSkills?: string[];

  @IsOptional()
  @IsEnum(ChallengeDifficulty)
  difficulty?: ChallengeDifficulty;

  @IsOptional()
  @IsString()
  nasaOriginalUrl?: string;

  @IsOptional()
  @IsString()
  nasaChallengeId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  displayOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
