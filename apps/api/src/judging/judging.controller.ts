import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { RequireRole } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/types/auth-user.interface.js';
import { JudgingService } from './judging.service.js';
import { AssignmentDto, EvaluationDto, RubricDto } from './dto.js';
import type { Response } from 'express';

@Controller('judging')
@UseGuards(AuthGuard, RolesGuard)
export class JudgingController {
  constructor(private readonly service: JudgingService) {}
  @Delete('assignments/:id') @RequireRole('organizer') unassign(
    @Param('id') id: string,
  ) {
    return this.service.unassign(id);
  }
  @Get('assignments') @RequireRole('judge') list(
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.list(user.id);
  }
  @Put('assignments/:id') @RequireRole('judge') save(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: EvaluationDto,
  ) {
    return this.service.save(id, user.id, dto);
  }
  @Get('results') async results(@Res() response: Response) {
    // Nest sends an empty body for null; clients need a valid JSON null here.
    return response.json(await this.service.results());
  }
  @Get('manage') @RequireRole('organizer') manage() {
    return this.service.manage();
  }
  @Post('rubrics') @RequireRole('organizer') rubric(@Body() dto: RubricDto) {
    return this.service.createRubric(dto);
  }
  @Post('assignments') @RequireRole('organizer') assign(
    @Body() dto: AssignmentDto,
  ) {
    return this.service.assign(dto);
  }
  @Post('publication') @RequireRole('organizer') publish() {
    return this.service.publish();
  }
  @Delete('publication') @RequireRole('organizer') unpublish() {
    return this.service.unpublish();
  }
}
