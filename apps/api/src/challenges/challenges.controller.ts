import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { RequireRole } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/types/auth-user.interface.js';
import { ChallengesService } from './challenges.service.js';
import {
  ChallengeVersionDto,
  FavoriteChallengeDto,
  SaveChallengeDto,
  SearchChallengesDto,
} from './dto.js';

@Controller('challenges')
@UseGuards(AuthGuard, RolesGuard)
export class ChallengesController {
  constructor(private readonly service: ChallengesService) {}
  @Get() list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: SearchChallengesDto,
  ) {
    return this.service.list(user.id, query);
  }
  @Get('selection') selection(@CurrentUser() user: AuthenticatedUser) {
    return this.service.selection(user.id);
  }
  @Get('manage') @RequireRole('organizer') manage(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: SearchChallengesDto,
  ) {
    return this.service.list(user.id, query, true);
  }
  @Get('manage/legacy-teams') @RequireRole('organizer') legacy(
    @Query() query: SearchChallengesDto,
  ) {
    return this.service.legacy(query);
  }
  @Get('manage/:id') @RequireRole('organizer') edit(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.detail(id, user.id, true);
  }
  @Post('manage') @RequireRole('organizer') create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SaveChallengeDto,
  ) {
    return this.service.create(user.id, dto);
  }
  @Put('manage/:id') @RequireRole('organizer') update(
    @Param('id') id: string,
    @Body() dto: SaveChallengeDto,
  ) {
    return this.service.update(id, dto);
  }
  @Delete('manage/:id') @RequireRole('organizer') archive(
    @Param('id') id: string,
    @Body() dto: ChallengeVersionDto,
  ) {
    return this.service.archive(id, dto.expectedVersion);
  }
  @Post('manage/:id/teams/:teamId') @RequireRole('organizer') reconcile(
    @Param('id') id: string,
    @Param('teamId') teamId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.select(id, user.id, teamId);
  }
  @Put(':id/favorite') favorite(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: FavoriteChallengeDto,
  ) {
    return this.service.favorite(id, user.id, dto.saved);
  }
  @Post(':id/select') select(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.select(id, user.id);
  }
  @Get(':key') detail(
    @Param('key') key: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.detail(key, user.id);
  }
}
