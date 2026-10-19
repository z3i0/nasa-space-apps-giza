import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsObject,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class CriterionDto {
  @IsString() @MinLength(1) @MaxLength(100) name: string;
  @IsInt() @Min(1) @Max(100) weight: number;
}
export class RubricDto {
  @IsString() @MinLength(1) @MaxLength(100) name: string;
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => CriterionDto)
  criteria: CriterionDto[];
}
export class AssignmentDto {
  @IsUUID() judgeId: string;
  @IsUUID() teamId: string;
  @IsUUID() rubricId: string;
}
export class EvaluationDto {
  @IsObject() scores: Record<string, number>;
  @IsString() @MaxLength(10000) feedback: string;
  @IsBoolean() completed: boolean;
  @IsInt() @Min(1) version: number;
}
