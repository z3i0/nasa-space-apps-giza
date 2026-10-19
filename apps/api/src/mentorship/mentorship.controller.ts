import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/types/auth-user.interface.js';
import {
  BookSlotDto,
  CreateMentorshipRequestDto,
  DecideMentorshipRequestDto,
  MentorProfileDto,
  MessageDto,
  SessionNotesDto,
  SlotDto,
} from './dto.js';
import { MentorshipService } from './mentorship.service.js';

@Controller('mentorship')
@UseGuards(AuthGuard)
export class MentorshipController {
  constructor(private readonly service: MentorshipService) {}
  @Get('mentors') mentors() {
    return this.service.mentors();
  }
  @Put('profile') profile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: MentorProfileDto,
  ) {
    return this.service.profile(user.id, dto);
  }
  @Get('requests') requests(@CurrentUser() user: AuthenticatedUser) {
    return this.service.requests(user.id);
  }
  @Post('requests') create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateMentorshipRequestDto,
  ) {
    return this.service.createRequest(user.id, dto.mentorId, dto.message);
  }
  @Patch('requests/:id') decide(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: DecideMentorshipRequestDto,
  ) {
    return this.service.decide(id, user.id, dto.status);
  }
  @Get('requests/:id/messages') messages(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query('before') before?: string,
  ) {
    return this.service.messages(id, user.id, before);
  }
  @Post('requests/:id/messages') send(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: MessageDto,
  ) {
    return this.service.send(id, user.id, dto.content);
  }
  @Put('requests/:id/notes') notes(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SessionNotesDto,
  ) {
    return this.service.saveNotes(id, user.id, dto.content);
  }
  @Post('slots') slot(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SlotDto,
  ) {
    return this.service.createSlot(user.id, dto.startTime, dto.endTime);
  }
  @Delete('slots/:id') deleteSlot(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.deleteSlot(user.id, id);
  }
  @Post('slots/:id/book') book(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: BookSlotDto,
  ) {
    return this.service.bookSlot(user.id, id, dto.requestId);
  }
}
