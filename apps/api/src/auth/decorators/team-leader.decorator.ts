import { SetMetadata } from '@nestjs/common';

export const REQUIRE_TEAM_LEADER_KEY = 'requireTeamLeader';
export const RequireTeamLeader = () => SetMetadata(REQUIRE_TEAM_LEADER_KEY, true);
