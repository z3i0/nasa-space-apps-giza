import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class InviteMemberDto {
  @IsString()
  userId!: string;

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
