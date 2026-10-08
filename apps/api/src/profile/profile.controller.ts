import {
  Controller,
  Get,
  Put,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ProfileService } from './profile.service.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { SearchProfilesDto } from './dto/search-profiles.dto.js';
import { AuthGuard } from '../auth/guards/auth.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Public } from '../auth/decorators/public.decorator.js';
import type { AuthenticatedUser } from '../auth/types/auth-user.interface.js';
import type { Request } from 'express';

@Controller('profiles')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  /**
   * Get current authenticated user's profile
   */
  @UseGuards(AuthGuard)
  @Get('me')
  async getMyProfile(@CurrentUser() user: AuthenticatedUser) {
    return this.profileService.getMyProfile(user.id);
  }

  /**
   * Update current authenticated user's profile
   */
  @UseGuards(AuthGuard)
  @Put('me')
  async updateMyProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.profileService.updateMyProfile(user.id, dto);
  }

  /**
   * PATCH alias for updating current user's profile
   */
  @UseGuards(AuthGuard)
  @Patch('me')
  async patchMyProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.profileService.updateMyProfile(user.id, dto);
  }

  /**
   * Get teammate recommendations for the authenticated user (Section 3.2)
   */
  @UseGuards(AuthGuard)
  @Get('recommendations')
  async getRecommendations(@CurrentUser() user: AuthenticatedUser) {
    return this.profileService.getRecommendations(user.id);
  }

  /**
   * Search and filter public profiles (for team matching / browsing participants)
   */
  @Public()
  @Get()
  async searchProfiles(@Query() query: SearchProfilesDto) {
    return this.profileService.searchProfiles(query);
  }

  /**
   * Get a public profile by profile ID or user ID
   */
  @Public()
  @Get(':id')
  async getProfileById(
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    const viewerId = req.user?.id;
    const viewerRoles = req.user?.roles || [];
    return this.profileService.getProfileById(id, viewerId, viewerRoles);
  }
}
