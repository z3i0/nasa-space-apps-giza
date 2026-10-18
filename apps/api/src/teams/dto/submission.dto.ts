import { Transform } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsString,
  IsUrl,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class SaveSubmissionDto {
  @IsInt()
  @Min(0)
  version!: number;

  @IsIn(['draft', 'submitted'])
  status!: 'draft' | 'submitted';

  @Transform(trim)
  @IsString()
  @MaxLength(100)
  title!: string;

  @Transform(trim)
  @IsString()
  @MaxLength(5000)
  summary!: string;

  @Transform(trim)
  @IsString()
  @MaxLength(200)
  challenge!: string;

  @Transform(trim)
  @ValidateIf((_, value) => value !== '')
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @MaxLength(2000)
  projectUrl!: string;

  @Transform(trim)
  @ValidateIf((_, value) => value !== '')
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @MaxLength(2000)
  repositoryUrl!: string;

  @Transform(trim)
  @ValidateIf((_, value) => value !== '')
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @MaxLength(2000)
  demoUrl!: string;
}
