import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ChallengesService } from './challenges.service.js';
import { ChallengeFilterDto } from './dto/challenge-filter.dto.js';
import { CreateChallengeDto, UpdateChallengeDto } from './dto/create-challenge.dto.js';
import { CreateChallengeResourceDto } from './dto/challenge-resource.dto.js';
import { AuthGuard } from '../auth/guards/auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { RequireRole } from '../auth/decorators/roles.decorator.js';

@Controller('challenges')
export class ChallengesController {
  constructor(private readonly challengesService: ChallengesService) {}

  /**
   * Public: List all active challenges with search and filters (subjects, skills, difficulty)
   */
  @Get()
  findAll(@Query() filter: ChallengeFilterDto) {
    return this.challengesService.findAll(filter);
  }

  /**
   * Public: Get dynamic subjects with challenge counts for filter chips/badges
   */
  @Get('subjects')
  getSubjects(@Query('year') year?: string) {
    const parsedYear = year ? parseInt(year, 10) : 2026;
    return this.challengesService.getSubjects(parsedYear);
  }

  /**
   * Public: Get challenge detail by slug or ID with all curated resources
   */
  @Get(':slugOrId')
  findBySlugOrId(@Param('slugOrId') slugOrId: string) {
    return this.challengesService.findBySlugOrId(slugOrId);
  }

  /**
   * Admin / Organizer: Create new challenge
   */
  @Post()
  @UseGuards(AuthGuard, RolesGuard)
  @RequireRole('organizer')
  create(@Body() dto: CreateChallengeDto) {
    return this.challengesService.create(dto);
  }

  /**
   * Admin / Organizer: Update existing challenge
   */
  @Patch(':id')
  @UseGuards(AuthGuard, RolesGuard)
  @RequireRole('organizer')
  update(@Param('id') id: string, @Body() dto: UpdateChallengeDto) {
    return this.challengesService.update(id, dto);
  }

  /**
   * Admin / Organizer: Delete challenge
   */
  @Delete(':id')
  @UseGuards(AuthGuard, RolesGuard)
  @RequireRole('organizer')
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(@Param('id') id: string) {
    return this.challengesService.delete(id);
  }

  /**
   * Admin / Organizer: Attach resource to a challenge
   */
  @Post(':id/resources')
  @UseGuards(AuthGuard, RolesGuard)
  @RequireRole('organizer')
  addResource(@Param('id') challengeId: string, @Body() dto: CreateChallengeResourceDto) {
    return this.challengesService.addResource(challengeId, dto);
  }

  /**
   * Admin / Organizer: Remove a resource
   */
  @Delete('resources/:resourceId')
  @UseGuards(AuthGuard, RolesGuard)
  @RequireRole('organizer')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeResource(@Param('resourceId') resourceId: string) {
    return this.challengesService.removeResource(resourceId);
  }
}
