import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AuthGuard } from '../auth/guards/auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { RequireRole } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/types/auth-user.interface.js';
import { AccountService } from './account.service.js';
class SelectRoleDto {
  @IsIn(['participant', 'mentor', 'judge', 'organizer', 'competition'])
  role: string;
}
class ReviewRoleDto {
  @IsOptional()
  @IsIn(['pending', 'approved', 'rejected'])
  expectedStatus?: string;
  @IsIn(['approved', 'rejected']) decision: 'approved' | 'rejected';
  @IsOptional() @IsString() @MaxLength(1000) reason?: string;
}
class DirectoryQuery {
  @IsIn(['participants', 'teams', 'mentors', 'judges'])
  kind: 'participants' | 'teams' | 'mentors' | 'judges';
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

class AdminUpdateUserDto {
  @IsOptional() @IsString() @MaxLength(150) name?: string;
  @IsOptional() @IsString() @MaxLength(150) email?: string;
  @IsOptional() @IsString() @MaxLength(50) phone?: string;
  @IsOptional() @IsString() @MaxLength(150) institution?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) skills?: string[];
  @IsOptional() @IsString() @MaxLength(2000) bio?: string;
  @IsOptional() @IsString() @MaxLength(200) availability?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

class AdminChangeRoleDto {
  @IsIn(['participant', 'mentor', 'judge', 'organizer'])
  role: 'participant' | 'mentor' | 'judge' | 'organizer';
}

class AdminResetPasswordDto {
  @IsString() @MinLength(6) @MaxLength(100) password: string;
}

class AdminToggleStatusDto {
  @IsBoolean() isActive: boolean;
}

class AdminUpdateTeamDto {
  @IsOptional() @IsString() @MaxLength(120) name?: string;
  @IsOptional() @IsString() @MaxLength(150) challenge?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(20) maxMembers?: number;
  @IsOptional() @IsIn(['not_started', 'draft', 'submitted'])
  submissionStatus?: 'not_started' | 'draft' | 'submitted';
}

class AdminChangeTeamMemberRoleDto {
  @IsIn(['leader', 'member']) role: 'leader' | 'member';
}

@Controller('account')
@UseGuards(AuthGuard, RolesGuard)
export class AccountController {
  constructor(private readonly service: AccountService) {}
  @Get('organizer-summary') @RequireRole('organizer') summary() {
    return this.service.organizerSummary();
  }
  @Get('competition-analytics') @RequireRole('organizer') competitionAnalytics() {
    return this.service.competitionAnalytics();
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

  // -------------------------------------------------------------
  // Organizer Administrative Endpoints
  // -------------------------------------------------------------
  @Patch('users/:id')
  @RequireRole('organizer')
  adminUpdateUser(
    @Param('id') id: string,
    @Body() dto: AdminUpdateUserDto,
  ) {
    return this.service.adminUpdateUser(id, dto);
  }

  @Post('users/:id/role')
  @RequireRole('organizer')
  adminChangeRole(
    @Param('id') id: string,
    @Body() dto: AdminChangeRoleDto,
  ) {
    return this.service.adminChangeUserRole(id, dto.role);
  }

  @Post('users/:id/reset-password')
  @RequireRole('organizer')
  adminResetPassword(
    @Param('id') id: string,
    @Body() dto: AdminResetPasswordDto,
  ) {
    return this.service.adminResetUserPassword(id, dto.password);
  }

  @Patch('users/:id/status')
  @RequireRole('organizer')
  adminToggleStatus(
    @Param('id') id: string,
    @Body() dto: AdminToggleStatusDto,
  ) {
    return this.service.adminToggleUserStatus(id, dto.isActive);
  }

  @Delete('users/:id')
  @RequireRole('organizer')
  adminDeleteUser(@Param('id') id: string) {
    return this.service.adminDeleteUser(id);
  }

  @Patch('teams/:id')
  @RequireRole('organizer')
  adminUpdateTeam(
    @Param('id') id: string,
    @Body() dto: AdminUpdateTeamDto,
  ) {
    return this.service.adminUpdateTeam(id, dto);
  }

  @Post('teams/:id/members/:userId/role')
  @RequireRole('organizer')
  adminChangeMemberRole(
    @Param('id') teamId: string,
    @Param('userId') userId: string,
    @Body() dto: AdminChangeTeamMemberRoleDto,
  ) {
    return this.service.adminChangeTeamMemberRole(teamId, userId, dto.role);
  }

  @Delete('teams/:id/members/:userId')
  @RequireRole('organizer')
  adminRemoveMember(
    @Param('id') teamId: string,
    @Param('userId') userId: string,
  ) {
    return this.service.adminRemoveTeamMember(teamId, userId);
  }

  @Delete('teams/:id')
  @RequireRole('organizer')
  adminDeleteTeam(@Param('id') teamId: string) {
    return this.service.adminDeleteTeam(teamId);
  }
}
