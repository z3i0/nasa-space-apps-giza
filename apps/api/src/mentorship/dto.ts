import {
  IsArray,
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class MentorProfileDto {
  @IsArray() @IsString({ each: true }) expertise: string[];
  @IsString() @MaxLength(240) availability: string;
  @IsString() @MaxLength(1000) bio: string;
}

export class CreateMentorshipRequestDto {
  @IsString() mentorId: string;
  @IsString() @MinLength(10) @MaxLength(1000) message: string;
}

export class DecideMentorshipRequestDto {
  @IsIn(['accepted', 'declined', 'canceled', 'completed']) status:
    'accepted' | 'declined' | 'canceled' | 'completed';
}

export class MessageDto {
  @IsString() @MinLength(1) @MaxLength(2000) content: string;
}

export class SessionNotesDto {
  @IsString()
  @MaxLength(2000)
  content: string;
}

export class SlotDto {
  @IsDateString() startTime: string;
  @IsDateString() endTime: string;
}

export class BookSlotDto {
  @IsString() requestId: string;
}
