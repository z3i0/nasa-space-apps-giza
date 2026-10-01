import { ForbiddenException } from '@nestjs/common';
import type { AuthenticatedUser } from '../types/auth-user.interface.js';

export interface ScoreQueryFilter {
  teamId?: string;
  categoryId?: string;
  [key: string]: any;
}

export interface ScopedScoreWhereClause extends ScoreQueryFilter {
  judgeId?: string;
}

/**
 * Enforces role-based scoring access:
 * - 'organizer': full access to all judges' scores across all teams.
 * - 'judge': strictly isolated and filtered by judgeId = user.id (cannot view other judges' scores).
 * - Other roles: access denied.
 */
export function getScoresFilter(
  user: AuthenticatedUser,
  additionalFilters?: ScoreQueryFilter,
): ScopedScoreWhereClause {
  if (user.roles?.includes('organizer')) {
    return {
      ...additionalFilters,
    };
  }

  if (user.roles?.includes('judge')) {
    return {
      ...additionalFilters,
      judgeId: user.id, // Strictly scoped to current judge
    };
  }

  throw new ForbiddenException(
    'Access denied: You do not have the required role to view judging scores.',
  );
}
