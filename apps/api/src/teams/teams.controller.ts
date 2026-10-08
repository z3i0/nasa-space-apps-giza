import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { TeamsService } from './teams.service.js';
import { CreateTeamDto } from './dto/create-team.dto.js';
import { UpdateTeamDto } from './dto/update-team.dto.js';
import { CreateTaskDto, UpdateTaskDto } from './dto/team-task.dto.js';
import {
  InviteMemberDto,
  JoinRequestDto,
  RespondRequestDto,
} from './dto/team-request.dto.js';
import { SearchTeamsDto } from './dto/search-teams.dto.js';
import { AuthGuard } from '../auth/guards/auth.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Public } from '../auth/decorators/public.decorator.js';
import type { AuthenticatedUser } from '../auth/types/auth-user.interface.js';

@Controller('teams')
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  /**
   * 1. Create a new team (creator becomes leader)
   */
  @UseGuards(AuthGuard)
  @Post()
  async createTeam(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateTeamDto,
  ) {
    return this.teamsService.createTeam(user.id, dto);
  }

  /**
   * 2. Get currently logged-in user's team details
   */
  @UseGuards(AuthGuard)
  @Get('me')
  async getMyTeam(@CurrentUser() user: AuthenticatedUser) {
    const result = await this.teamsService.getMyTeam(user.id);
    return result || { team: null };
  }

  /**
   * 3. List and search teams
   */
  @Public()
  @Get()
  async listTeams(@Query() query: SearchTeamsDto) {
    return this.teamsService.listTeams(query);
  }

  /**
   * 4. Get team by ID
   */
  @Public()
  @Get(':id')
  async getTeamById(@Param('id') teamId: string) {
    return this.teamsService.getTeamById(teamId);
  }

  /**
   * 5. Update team details (leader or organizer)
   */
  @UseGuards(AuthGuard)
  @Put(':id')
  async updateTeam(
    @Param('id') teamId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateTeamDto,
  ) {
    return this.teamsService.updateTeam(teamId, user.id, user.roles, dto);
  }

  /**
   * 6. Invite a member to the team (Leader only)
   */
  @UseGuards(AuthGuard)
  @Post(':id/invitations')
  async inviteMember(
    @Param('id') teamId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: InviteMemberDto,
  ) {
    return this.teamsService.inviteMember(teamId, user.id, dto);
  }

  /**
   * 7. Respond to an invitation (accept or reject)
   */
  @UseGuards(AuthGuard)
  @Post('invitations/:id/respond')
  async respondToInvitation(
    @Param('id') invitationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: RespondRequestDto,
  ) {
    return this.teamsService.respondToInvitation(invitationId, user.id, dto.accept);
  }

  /**
   * 8. Request to join a team (Participant)
   */
  @UseGuards(AuthGuard)
  @Post(':id/join-requests')
  async requestToJoinTeam(
    @Param('id') teamId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: JoinRequestDto,
  ) {
    return this.teamsService.requestToJoinTeam(teamId, user.id, dto);
  }

  /**
   * 9. Respond to join request (Leader only)
   */
  @UseGuards(AuthGuard)
  @Post('join-requests/:id/respond')
  async respondToJoinRequest(
    @Param('id') requestId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: RespondRequestDto,
  ) {
    return this.teamsService.respondToJoinRequest(requestId, user.id, dto.accept);
  }

  /**
   * 10. Remove a member or leave team
   */
  @UseGuards(AuthGuard)
  @Delete(':id/members/:userId')
  async removeMember(
    @Param('id') teamId: string,
    @Param('userId') targetUserId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.teamsService.removeMember(teamId, user.id, targetUserId);
  }

  /**
   * 11. Create a task in the team (Section 4)
   */
  @UseGuards(AuthGuard)
  @Post(':id/tasks')
  async createTask(
    @Param('id') teamId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateTaskDto,
  ) {
    return this.teamsService.createTask(teamId, user.id, dto);
  }

  /**
   * 12. Update a task (status, assignedTo, etc.)
   */
  @UseGuards(AuthGuard)
  @Patch('tasks/:id')
  async updateTask(
    @Param('id') taskId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateTaskDto,
  ) {
    return this.teamsService.updateTask(taskId, user.id, dto);
  }

  /**
   * 13. Delete a task (Leader only)
   */
  @UseGuards(AuthGuard)
  @Delete('tasks/:id')
  async deleteTask(
    @Param('id') taskId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.teamsService.deleteTask(taskId, user.id);
  }
}
