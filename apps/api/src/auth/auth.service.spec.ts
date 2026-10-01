import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuthService } from './auth.service.js';
import {
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import type { PrismaService } from '../prisma/prisma.service.js';
import bcrypt from 'bcryptjs';

describe('AuthService', () => {
  let service: AuthService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      user: {
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      role: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
      },
      account: {
        create: vi.fn(),
        findFirst: vi.fn(),
        update: vi.fn(),
      },
      session: {
        create: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      passwordResetToken: {
        create: vi.fn(),
        findUnique: vi.fn(),
        delete: vi.fn(),
      },
      userRole: {
        deleteMany: vi.fn(),
        createMany: vi.fn(),
      },
      $transaction: vi.fn((ops) => Promise.all(ops)),
    };

    service = new AuthService(
      mockPrisma as unknown as PrismaService,
    );
  });

  describe('Registration (Participant Self-Registration)', () => {
    it('successfully registers participant and returns tokens without password_hash', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.role.findUnique.mockResolvedValue({ id: 'role-participant', name: 'participant' });

      mockPrisma.user.create.mockResolvedValue({
        id: 'user-1',
        name: 'Jane Doe',
        email: 'jane@example.com',
        phone: '1234567890',
        isActive: true,
        deletedAt: null,
        passwordHash: 'hashed-pwd',
        roles: [
          {
            role: {
              name: 'participant',
            },
          },
        ],
      });

      mockPrisma.account.create.mockResolvedValue({});
      mockPrisma.session.create.mockResolvedValue({});

      const result = await service.register({
        name: 'Jane Doe',
        email: 'jane@example.com',
        password: 'password123',
        phone: '1234567890',
      });

      expect(result.user.id).toBe('user-1');
      expect(result.user.email).toBe('jane@example.com');
      expect(result.user.roles).toContain('participant');
      expect((result.user as any).passwordHash).toBeUndefined();
      expect(result.tokens.accessToken).toBeDefined();
      expect(result.tokens.refreshToken).toBeDefined();
    });

    it('rejects registration if email already exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'existing-id', email: 'test@example.com' });

      await expect(
        service.register({
          name: 'Test User',
          email: 'test@example.com',
          password: 'password123',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('Login', () => {
    it('successfully logs in with valid credentials and updates last_login_at', async () => {
      const plainPassword = 'validPassword123';
      const hash = await bcrypt.hash(plainPassword, 10);

      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'u-123',
        name: 'John Smith',
        email: 'john@example.com',
        passwordHash: hash,
        isActive: true,
        deletedAt: null,
        roles: [{ role: { name: 'participant' } }],
      });

      mockPrisma.account.findFirst.mockResolvedValue({
        password: hash,
      });

      mockPrisma.user.update.mockResolvedValue({});
      mockPrisma.session.create.mockResolvedValue({});

      const result = await service.login({
        email: 'john@example.com',
        password: plainPassword,
      });

      expect(result.user.id).toBe('u-123');
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'u-123' },
          data: expect.objectContaining({ lastLoginAt: expect.any(Date) }),
        }),
      );
      expect((result.user as any).passwordHash).toBeUndefined();
    });

    it('returns generic error on wrong password (prevent enumeration)', async () => {
      const hash = await bcrypt.hash('correctPassword', 10);

      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'u-123',
        email: 'john@example.com',
        passwordHash: hash,
        isActive: true,
        deletedAt: null,
        roles: [],
      });

      mockPrisma.account.findFirst.mockResolvedValue({
        password: hash,
      });

      await expect(
        service.login({
          email: 'john@example.com',
          password: 'wrongPassword',
        }),
      ).rejects.toThrow(new UnauthorizedException('Invalid email or password'));
    });

    it('returns generic error on unknown email (prevent enumeration)', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login({
          email: 'nonexistent@example.com',
          password: 'anyPassword',
        }),
      ).rejects.toThrow(new UnauthorizedException('Invalid email or password'));
    });

    it('blocks login if user is inactive (is_active = false)', async () => {
      const plainPassword = 'password123';
      const hash = await bcrypt.hash(plainPassword, 10);

      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'u-123',
        email: 'inactive@example.com',
        passwordHash: hash,
        isActive: false, // Inactive
        deletedAt: null,
        roles: [],
      });

      mockPrisma.account.findFirst.mockResolvedValue({
        password: hash,
      });

      await expect(
        service.login({
          email: 'inactive@example.com',
          password: plainPassword,
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('blocks login if user is soft deleted (deleted_at is not null)', async () => {
      const plainPassword = 'password123';
      const hash = await bcrypt.hash(plainPassword, 10);

      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'u-123',
        email: 'deleted@example.com',
        passwordHash: hash,
        isActive: true,
        deletedAt: new Date(), // Soft deleted
        roles: [],
      });

      mockPrisma.account.findFirst.mockResolvedValue({
        password: hash,
      });

      await expect(
        service.login({
          email: 'deleted@example.com',
          password: plainPassword,
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('Admin Operations (Organizers only)', () => {
    it('allows creating mentors and judges with assigned roles', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.role.findMany.mockResolvedValue([
        { id: 'r-mentor', name: 'mentor' },
      ]);

      mockPrisma.user.create.mockResolvedValue({
        id: 'mentor-1',
        name: 'Dr. Mentor',
        email: 'mentor@example.com',
        phone: null,
        role: 'mentor',
        isActive: true,
        deletedAt: null,
        roles: [{ role: { name: 'mentor' } }],
      });

      mockPrisma.account.create.mockResolvedValue({});

      const res = await service.adminCreateUser({
        name: 'Dr. Mentor',
        email: 'mentor@example.com',
        password: 'SecurePassword123!',
        roles: ['mentor'],
      });

      expect(res.id).toBe('mentor-1');
      expect(res.roles).toContain('mentor');
    });
  });
});
