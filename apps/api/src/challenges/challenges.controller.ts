import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/types/auth-user.interface.js';
import { ChallengesService } from './challenges.service.js';
import { FavoriteChallengeDto, SearchChallengesDto } from './dto.js';

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
  @Get('subjects') subjects(@Query() query: SearchChallengesDto) {
    return this.service.getSubjects(query.year);
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
