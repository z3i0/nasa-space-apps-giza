import { SetMetadata } from '@nestjs/common';

export const REQUIRE_TEAM_MEMBER_KEY = 'requireTeamMember';
export const RequireTeamMember = () => SetMetadata(REQUIRE_TEAM_MEMBER_KEY, true);
