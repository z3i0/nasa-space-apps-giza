import { IsOptional, IsString, MinLength, MaxLength } from 'class-validator';

export class CreateTeamDto {
  @IsString()
  @MinLength(3, { message: 'Team name must be at least 3 characters long' })
  @MaxLength(50, { message: 'Team name cannot exceed 50 characters' })
  name!: string;

  @IsString()
  @IsOptional()
  @MaxLength(500, { message: 'Description cannot exceed 500 characters' })
  description?: string;

  @IsString()
  @IsOptional()
  challenge?: string;

  @IsString()
  @IsOptional()
  track?: string;

  @IsString()
  @IsOptional()
  assignedRole?: string;
}
