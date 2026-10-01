import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard.js';
import { TeamMemberGuard } from '../auth/guards/team-member.guard.js';
import { TeamLeaderGuard } from '../auth/guards/team-leader.guard.js';
import { RequireTeamMember } from '../auth/decorators/team-member.decorator.js';
import { RequireTeamLeader } from '../auth/decorators/team-leader.decorator.js';

@Controller('teams')
@UseGuards(AuthGuard)
export class TeamsController {
  /**
   * Accessible by team members or organizer.
   */
  @Get(':teamId')
  @RequireTeamMember()
  @UseGuards(TeamMemberGuard)
  async getTeam(@Param('teamId') teamId: string) {
    return {
      success: true,
      message: `Accessed team details for team ${teamId}`,
      teamId,
    };
  }

  /**
   * Accessible strictly by the team leader or organizer.
   */
  @Post(':teamId/manage')
  @RequireTeamLeader()
  @UseGuards(TeamLeaderGuard)
  @HttpCode(HttpStatus.OK)
  async manageTeam(@Param('teamId') teamId: string) {
    return {
      success: true,
      message: `Management action executed by team leader for team ${teamId}`,
      teamId,
    };
  }
}
