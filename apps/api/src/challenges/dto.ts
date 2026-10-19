import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { ChallengeDifficulty } from '@prisma/client';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class ChallengeResourceDto {
  @IsString() @Transform(trim) @MinLength(1) @MaxLength(120) label: string;
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @MaxLength(2000)
  url: string;
}

export class SaveChallengeDto {
  @IsString() @Transform(trim) @MinLength(3) @MaxLength(200) title: string;
  @IsOptional() @IsString() @Transform(trim) @MaxLength(200) titleAr?: string;
  @IsString() @Transform(trim) @MinLength(10) @MaxLength(500) summary: string;
  @IsOptional() @IsString() @Transform(trim) @MaxLength(500) summaryAr?: string;
  @IsString()
  @Transform(trim)
  @MinLength(20)
  @MaxLength(12000)
  description: string;
  @IsOptional()
  @IsString()
  @Transform(trim)
  @MaxLength(12000)
  descriptionAr?: string;
  @IsString() @Transform(trim) @MinLength(2) @MaxLength(60) category: string;
  @IsEnum(ChallengeDifficulty) difficulty: ChallengeDifficulty;
  @IsInt() @Min(2000) @Max(2100) year: number;
  @IsArray()
  @ArrayMaxSize(12)
  @IsString({ each: true })
  @MaxLength(40, { each: true })
  tags: string[];
  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @MaxLength(2000)
  sourceUrl?: string;
  @IsBoolean() isPublished: boolean;
  @IsBoolean() isArchived: boolean;
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => ChallengeResourceDto)
  resources: ChallengeResourceDto[];
  @IsOptional() @IsInt() @Min(1) expectedVersion?: number;
}

export class SearchChallengesDto {
  @IsOptional() @IsString() @MaxLength(100) search?: string;
  @IsOptional() @IsString() @MaxLength(60) category?: string;
  @IsOptional() @IsEnum(ChallengeDifficulty) difficulty?: ChallengeDifficulty;
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  year?: number;
  @IsOptional() @IsEnum(['all', 'saved']) view?: 'all' | 'saved';
  @IsOptional() @IsEnum(['all', 'published', 'draft', 'archived']) status?:
    'all' | 'published' | 'draft' | 'archived';
  @Type(() => Number) @IsInt() @Min(1) @Max(100000) page: number = 1;
  @Type(() => Number) @IsInt() @Min(1) @Max(100) limit: number = 20;
}

export class FavoriteChallengeDto {
  @IsBoolean() saved: boolean;
}
export class ChallengeVersionDto {
  @IsInt() @Min(1) expectedVersion: number;
}
