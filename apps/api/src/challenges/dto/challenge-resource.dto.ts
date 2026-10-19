import { IsString, IsNotEmpty, IsOptional, IsEnum, IsBoolean, IsInt } from 'class-validator';
import { Type } from 'class-transformer';
import { ResourceType, ResourceLanguage } from '@prisma/client';

export class CreateChallengeResourceDto {
  @IsString()
  @IsNotEmpty()
  titleEn!: string;

  @IsString()
  @IsNotEmpty()
  titleAr!: string;

  @IsOptional()
  @IsString()
  descriptionEn?: string;

  @IsOptional()
  @IsString()
  descriptionAr?: string;

  @IsString()
  @IsNotEmpty()
  url!: string;

  @IsOptional()
  @IsEnum(ResourceType)
  type?: ResourceType;

  @IsOptional()
  @IsEnum(ResourceLanguage)
  language?: ResourceLanguage;

  @IsOptional()
  @IsBoolean()
  isOfficial?: boolean;

  @IsOptional()
  @IsBoolean()
  isCurated?: boolean;

  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @IsOptional()
  metadata?: Record<string, unknown>;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  order?: number;
}
