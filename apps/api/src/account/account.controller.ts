import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AuthGuard } from '../auth/guards/auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { RequireRole } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/types/auth-user.interface.js';
import { AccountService } from './account.service.js';
class SelectRoleDto {
  @IsIn(['participant', 'mentor', 'judge', 'organizer']) role: string;
}
class ReviewRoleDto {
  @IsOptional()
  @IsIn(['pending', 'approved', 'rejected'])
  expectedStatus?: string;
  @IsIn(['approved', 'rejected']) decision: 'approved' | 'rejected';
  @IsOptional() @IsString() @MaxLength(1000) reason?: string;
}
class DirectoryQuery {
  @IsIn(['participants', 'teams']) kind: 'participants' | 'teams';
  @IsOptional() @IsString() @MaxLength(120) search?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page: number = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(50) limit: number =
    20;
}
class RequestsTrackingQuery {
  @IsOptional() @IsString() type?: string;
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() @MaxLength(120) search?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page: number = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit: number =
    30;
}
class MarkNotificationDto {
  @IsOptional() @IsString() id?: string;
}
@Controller('account')
@UseGuards(AuthGuard, RolesGuard)
export class AccountController {
  constructor(private readonly service: AccountService) {}
  @Get('organizer-summary') @RequireRole('organizer') summary() {
    return this.service.organizerSummary();
  }
  @Get('directory') @RequireRole('organizer') directory(
    @Query() query: DirectoryQuery,
  ) {
    return this.service.directory(
      query.kind,
      query.search || '',
      query.page,
      query.limit,
    );
  }
  @Get('challenge-options') challenges() {
    return this.service.challengeOptions();
  }
  @Get('access/:role') access(
    @CurrentUser() user: AuthenticatedUser,
    @Param('role') role: string,
  ) {
    return this.service.access(user.id, role);
  }
  @Get('overview') overview(@CurrentUser() user: AuthenticatedUser) {
    return this.service.overview(user.id);
  }
  @Post('role-selection') select(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SelectRoleDto,
  ) {
    return this.service.selectRole(user.id, dto.role);
  }
  @Get('role-applications') @RequireRole('organizer') applications() {
    return this.service.applications();
  }
  @Post('role-applications/:id/review') @RequireRole('organizer') review(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ReviewRoleDto,
  ) {
    return this.service.review(
      id,
      user.id,
      dto.decision,
      dto.reason,
      dto.expectedStatus,
    );
  }
  @Get('requests-tracking') @RequireRole('organizer') requestsTracking(
    @Query() query: RequestsTrackingQuery,
  ) {
    return this.service.requestsTracking(query);
  }
  @Get('notifications') getNotifications(
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.getNotifications(user.id);
  }
  @Post('notifications/mark-read') markNotificationRead(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: MarkNotificationDto,
  ) {
    return this.service.markNotificationRead(user.id, dto?.id);
  }
  @Delete('notifications/:id') deleteNotification(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.service.deleteNotification(user.id, id);
  }
}
