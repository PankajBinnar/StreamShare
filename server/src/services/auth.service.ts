import { prisma } from '../config/prisma.js';
import {
  hashPassword,
  verifyPassword,
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  hashToken,
  TokenPayload,
} from '../utils/crypto.js';
import { Role } from '@prisma/client';
import { logger } from '../config/logger.js';

export interface RegisterDTO {
  email: string;
  username: string;
  password: string;
  role?: Role;
}

export interface LoginDTO {
  email: string;
  password: string;
}

export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    username: string;
    role: Role;
    avatarUrl: string | null;
  };
}

export class AuthService {
  /**
   * Register a new user
   */
  async register(data: RegisterDTO): Promise<AuthResult> {
    const existing = await prisma.user.findFirst({
      where: {
        OR: [{ email: data.email.toLowerCase() }, { username: data.username }],
      },
    });

    if (existing) {
      throw { statusCode: 409, message: 'Email or username already in use.' };
    }

    const passwordHash = await hashPassword(data.password);

    const user = await prisma.user.create({
      data: {
        email: data.email.toLowerCase(),
        username: data.username,
        passwordHash,
        role: data.role || Role.USER,
      },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        avatarUrl: true,
      },
    });

    const tokenPayload: TokenPayload = {
      userId: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    // Persist hashed refresh token for revocation and rotation
    const tokenHash = hashToken(refreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    logger.info('New user successfully registered', { userId: user.id });

    return {
      accessToken,
      refreshToken,
      user,
    };
  }

  /**
   * Login user with credentials
   */
  async login(data: LoginDTO): Promise<AuthResult> {
    const user = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
    });

    if (!user) {
      throw { statusCode: 401, message: 'Invalid email or password.' };
    }

    if (user.isBanned) {
      throw {
        statusCode: 403,
        message: 'Account suspended due to policy violations. Contact admin support.',
      };
    }

    const isValidPassword = await verifyPassword(data.password, user.passwordHash);
    if (!isValidPassword) {
      throw { statusCode: 401, message: 'Invalid email or password.' };
    }

    const tokenPayload: TokenPayload = {
      userId: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    // Save hashed refresh token
    const tokenHash = hashToken(refreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    logger.info('User logged in successfully', { userId: user.id, role: user.role });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        avatarUrl: user.avatarUrl,
      },
    };
  }

  /**
   * Rotate Refresh Token securely:
   * Prevents replay attacks by invalidating old token upon use.
   * If a reused/revoked token is detected, all user sessions are revoked!
   */
  async refreshAccessToken(oldRefreshToken: string): Promise<{ accessToken: string; newRefreshToken: string }> {
    let payload: TokenPayload;
    try {
      payload = verifyRefreshToken(oldRefreshToken);
    } catch (err) {
      throw { statusCode: 401, message: 'Invalid or expired refresh token.' };
    }

    const oldHash = hashToken(oldRefreshToken);

    const storedToken = await prisma.refreshToken.findUnique({
      where: { tokenHash: oldHash },
    });

    // Reuse detection
    if (!storedToken || storedToken.revoked || storedToken.expiresAt < new Date()) {
      // Possible token theft! Invalidate all refresh tokens for this user
      if (storedToken?.revoked) {
        logger.warn('REFRESH TOKEN REUSE DETECTED! Revoking all sessions for user', {
          userId: payload.userId,
        });
        await prisma.refreshToken.updateMany({
          where: { userId: payload.userId },
          data: { revoked: true },
        });
      }
      throw { statusCode: 401, message: 'Refresh token invalid or previously revoked.' };
    }

    // Invalidate the used token
    await prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revoked: true },
    });

    // Check user status
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, email: true, username: true, role: true, isBanned: true },
    });

    if (!user || user.isBanned) {
      throw { statusCode: 403, message: 'User access revoked or suspended.' };
    }

    // Issue new pair
    const tokenPayload: TokenPayload = {
      userId: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
    };

    const newAccessToken = generateAccessToken(tokenPayload);
    const newRefreshToken = generateRefreshToken(tokenPayload);

    // Save new refresh token
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(newRefreshToken),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return {
      accessToken: newAccessToken,
      newRefreshToken,
    };
  }

  /**
   * Revoke refresh token on logout
   */
  async logout(refreshToken?: string): Promise<void> {
    if (!refreshToken) return;
    try {
      const tokenHash = hashToken(refreshToken);
      await prisma.refreshToken.updateMany({
        where: { tokenHash },
        data: { revoked: true },
      });
    } catch (e) {
      // Suppress on logout
    }
  }

  /**
   * Fetch current user profile
   */
  async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        avatarUrl: true,
        createdAt: true,
        _count: {
          select: {
            listings: true,
            buyerConversations: true,
            sellerConversations: true,
          },
        },
      },
    });

    if (!user) {
      throw { statusCode: 404, message: 'User not found.' };
    }

    return user;
  }
}

export const authService = new AuthService();

