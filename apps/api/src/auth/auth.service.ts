import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { auth } from './auth.js';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import type { RegisterDto } from './dto/register.dto.js';
import type { LoginDto } from './dto/login.dto.js';
import type { ForgotPasswordDto, ResetPasswordDto } from './dto/password-reset.dto.js';
import type { AdminCreateUserDto, AdminAssignRolesDto } from './dto/admin-user.dto.js';
import type { AuthResponse, AuthTokens, AuthenticatedUser } from './types/auth-user.interface.js';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  // -------------------------------------------------------------
  // Format / Sanitize User Profile
  // -------------------------------------------------------------
  private formatUser(user: any): AuthenticatedUser {
    const roleNames: string[] = user.roles && user.roles.length > 0
      ? user.roles.map((r: any) => r.role?.name || r.role || r)
      : user.role
      ? [user.role]
      : ['participant'];

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone || null,
      roles: roleNames,
    };
  }

  // -------------------------------------------------------------
  // Register (Public, Participants Only)
  // -------------------------------------------------------------
  async register(dto: RegisterDto): Promise<AuthResponse> {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
    });

    if (existing) {
      throw new ConflictException('An account with this email already exists.');
    }

    const participantRole = await this.prisma.role.findUnique({
      where: { name: 'participant' },
    });

    if (!participantRole) {
      throw new NotFoundException('Default participant role is not configured.');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const userName = (dto.name || dto.fullName || '').trim();

    const user = await this.prisma.user.create({
      data: {
        name: userName,
        email: dto.email.toLowerCase().trim(),
        passwordHash,
        phone: dto.phone?.trim() || null,
        role: 'participant',
        isActive: true,
        roles: {
          create: {
            roleId: participantRole.id,
          },
        },
      },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    // Create Better Auth credential account
    await this.prisma.account.create({
      data: {
        userId: user.id,
        accountId: user.id,
        providerId: 'credential',
        password: passwordHash,
      },
    });

    // Create Better Auth session token
    let sessionToken: string = crypto.randomUUID();
    try {
      const signInRes = await auth.api.signInEmail({
        body: { email: dto.email, password: dto.password },
      });
      if (signInRes?.token) {
        sessionToken = signInRes.token;
      }
    } catch {
      // Fallback: manually create session record in Prisma
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await this.prisma.session.create({
        data: {
          userId: user.id,
          token: sessionToken,
          expiresAt,
        },
      });
    }

    const formattedUser = this.formatUser(user);
    const tokens: AuthTokens = {
      accessToken: sessionToken,
      refreshToken: sessionToken,
    };

    return {
      user: formattedUser,
      tokens,
    };
  }

  // -------------------------------------------------------------
  // Login (Email + Password)
  // -------------------------------------------------------------
  async login(dto: LoginDto): Promise<AuthResponse> {
    const genericErrorMessage = 'Invalid email or password';

    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException(genericErrorMessage);
    }

    // Verify password via Account or user passwordHash
    const account = await this.prisma.account.findFirst({
      where: { userId: user.id, providerId: 'credential' },
    });

    const hashToVerify = account?.password || user.passwordHash;
    if (!hashToVerify) {
      throw new UnauthorizedException(genericErrorMessage);
    }

    const isPasswordValid = await bcrypt.compare(dto.password, hashToVerify);
    if (!isPasswordValid) {
      throw new UnauthorizedException(genericErrorMessage);
    }

    if (!user.isActive) {
      throw new UnauthorizedException('User account is deactivated. Contact organizer.');
    }

    if (user.deletedAt !== null) {
      throw new UnauthorizedException('User account has been deleted.');
    }

    // Update last_login_at
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Generate/retrieve Better Auth session
    let sessionToken: string = crypto.randomUUID();
    try {
      const signInRes = await auth.api.signInEmail({
        body: { email: dto.email, password: dto.password },
      });
      if (signInRes?.token) {
        sessionToken = signInRes.token;
      }
    } catch {
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await this.prisma.session.create({
        data: {
          userId: user.id,
          token: sessionToken,
          expiresAt,
        },
      });
    }

    const formattedUser = this.formatUser(user);
    const tokens: AuthTokens = {
      accessToken: sessionToken,
      refreshToken: sessionToken,
    };

    return {
      user: formattedUser,
      tokens,
    };
  }

  // -------------------------------------------------------------
  // Refresh Token
  // -------------------------------------------------------------
  async refreshToken(refreshToken: string): Promise<AuthTokens> {
    const session = await this.prisma.session.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!session || session.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token is invalid or expired');
    }

    if (!session.user.isActive || session.user.deletedAt !== null) {
      throw new UnauthorizedException('Account is invalid, deactivated, or deleted');
    }

    // Extend session expiresAt
    const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await this.prisma.session.update({
      where: { id: session.id },
      data: { expiresAt: newExpiresAt },
    });

    return {
      accessToken: session.token,
      refreshToken: session.token,
    };
  }

  // -------------------------------------------------------------
  // Get Me (/auth/me)
  // -------------------------------------------------------------
  async getMe(userId: string): Promise<AuthenticatedUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User profile not found');
    }

    return this.formatUser(user);
  }

  // -------------------------------------------------------------
  // Logout
  // -------------------------------------------------------------
  async logout(): Promise<{ success: boolean; message: string }> {
    return { success: true, message: 'Logged out successfully' };
  }

  // -------------------------------------------------------------
  // Password Reset Flow
  // -------------------------------------------------------------
  async forgotPassword(
    dto: ForgotPasswordDto,
  ): Promise<{ success: boolean; message: string; debugToken?: string }> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
    });

    const genericResponse = {
      success: true,
      message: 'If the email exists, a password reset link has been dispatched.',
    };

    if (!user || !user.isActive || user.deletedAt !== null) {
      return genericResponse;
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    return {
      ...genericResponse,
      ...(process.env.NODE_ENV !== 'production' ? { debugToken: rawToken } : {}),
    };
  }

  async resetPassword(dto: ResetPasswordDto): Promise<{ success: boolean; message: string }> {
    const tokenHash = crypto.createHash('sha256').update(dto.token).digest('hex');

    const resetRecord = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!resetRecord) {
      throw new BadRequestException('Invalid or expired password reset token');
    }

    if (resetRecord.expiresAt < new Date()) {
      await this.prisma.passwordResetToken.delete({ where: { id: resetRecord.id } });
      throw new BadRequestException('Password reset token has expired');
    }

    const newPasswordHash = await bcrypt.hash(dto.newPassword, 10);

    // Update user password and Account password
    await this.prisma.user.update({
      where: { id: resetRecord.userId },
      data: { passwordHash: newPasswordHash },
    });

    const acc = await this.prisma.account.findFirst({
      where: { userId: resetRecord.userId, providerId: 'credential' },
    });
    if (acc) {
      await this.prisma.account.update({
        where: { id: acc.id },
        data: { password: newPasswordHash },
      });
    }

    await this.prisma.passwordResetToken.delete({ where: { id: resetRecord.id } });

    return { success: true, message: 'Password has been reset successfully.' };
  }

  // -------------------------------------------------------------
  // Admin User Creation & Role Assignment
  // (Mentors, judges, organizers cannot self-register)
  // -------------------------------------------------------------
  async adminCreateUser(dto: AdminCreateUserDto): Promise<AuthenticatedUser> {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
    });

    if (existing) {
      throw new ConflictException('An account with this email already exists.');
    }

    const roles = await this.prisma.role.findMany({
      where: { name: { in: dto.roles } },
    });

    if (roles.length === 0) {
      throw new BadRequestException(`None of the provided roles [${dto.roles.join(', ')}] were found.`);
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const primaryRole = dto.roles[0] || 'participant';

    const userName = (dto.name || dto.fullName || '').trim();

    const user = await this.prisma.user.create({
      data: {
        name: userName,
        email: dto.email.toLowerCase().trim(),
        passwordHash,
        role: primaryRole,
        phone: dto.phone?.trim() || null,
        isActive: true,
        roles: {
          create: roles.map((r) => ({ roleId: r.id })),
        },
      },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    // Create Better Auth credential account
    await this.prisma.account.create({
      data: {
        userId: user.id,
        accountId: user.id,
        providerId: 'credential',
        password: passwordHash,
      },
    });

    return this.formatUser(user);
  }

  async adminAssignRoles(userId: string, dto: AdminAssignRolesDto): Promise<AuthenticatedUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found.`);
    }

    const roles = await this.prisma.role.findMany({
      where: { name: { in: dto.roles } },
    });

    if (roles.length === 0) {
      throw new BadRequestException(`None of the provided roles [${dto.roles.join(', ')}] exist.`);
    }

    const primaryRole = dto.roles[0] || 'participant';

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { role: primaryRole },
      }),
      this.prisma.userRole.deleteMany({
        where: { userId },
      }),
      this.prisma.userRole.createMany({
        data: roles.map((r) => ({
          userId,
          roleId: r.id,
        })),
      }),
    ]);

    return this.getMe(userId);
  }
}
