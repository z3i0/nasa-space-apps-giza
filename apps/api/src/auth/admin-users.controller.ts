import {
  Controller,
  Post,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { AdminCreateUserDto, AdminAssignRolesDto } from './dto/admin-user.dto.js';
import { AuthGuard } from './guards/auth.guard.js';
import { RolesGuard } from './guards/roles.guard.js';
import { RequireRole } from './decorators/roles.decorator.js';

@Controller('admin/users')
@UseGuards(AuthGuard, RolesGuard)
@RequireRole('organizer')
export class AdminUsersController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Only an organizer can create mentors, judges, or organizers.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createUser(@Body() dto: AdminCreateUserDto) {
    return this.authService.adminCreateUser(dto);
  }

  /**
   * Only an organizer can assign or update user roles.
   */
  @Post(':id/roles')
  @HttpCode(HttpStatus.OK)
  async assignRoles(
    @Param('id') userId: string,
    @Body() dto: AdminAssignRolesDto,
  ) {
    return this.authService.adminAssignRoles(userId, dto);
  }
}
