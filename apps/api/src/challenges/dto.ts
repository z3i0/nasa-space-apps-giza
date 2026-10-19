import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ChallengeDifficulty } from '@prisma/client';

export class SearchChallengesDto {
  @IsOptional() @IsString() @MaxLength(100) search?: string;
  @IsOptional() @IsString() @MaxLength(60) category?: string;
  @IsOptional() @IsString() @MaxLength(100) subject?: string;
  @IsOptional() @IsString() @MaxLength(100) skill?: string;
  @IsOptional() @IsEnum(ChallengeDifficulty) difficulty?: ChallengeDifficulty;
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  year?: number;
  @IsOptional() @IsEnum(['all', 'saved']) view?: 'all' | 'saved';
  @Type(() => Number) @IsInt() @Min(1) @Max(100000) page: number = 1;
  @Type(() => Number) @IsInt() @Min(1) @Max(100) limit: number = 20;
}

export class FavoriteChallengeDto {
  @IsBoolean() saved: boolean;
}
