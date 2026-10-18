import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class InviteMemberDto {
  @IsString()
  @IsOptional()
  username?: string;

  @IsString()
  @IsOptional()
  userId?: string;

  @IsString()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  assignedRole?: string;
}

export class JoinRequestDto {
  @IsString()
  @IsOptional()
  @MaxLength(300)
  message?: string;
}

export class RespondRequestDto {
  @IsBoolean()
  accept!: boolean;
}
