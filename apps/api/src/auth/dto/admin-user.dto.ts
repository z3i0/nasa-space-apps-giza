import {
  IsArray,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class AdminCreateUserDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  fullName?: string;

  @IsEmail({}, { message: 'Must be a valid email address' })
  email!: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  password!: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsArray({ message: 'Roles must be an array of role names' })
  @IsNotEmpty({ message: 'At least one role is required' })
  roles!: string[];
}

export class AdminAssignRolesDto {
  @IsArray({ message: 'Roles must be an array of role names' })
  @IsNotEmpty({ message: 'Roles array cannot be empty' })
  roles!: string[];
}
