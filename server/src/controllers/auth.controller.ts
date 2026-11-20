import { Request, Response } from 'express';
import { authService } from '../services/auth.service.js';
import { AuthenticatedRequest } from '../middlewares/auth.middleware.js';
import { env } from '../config/environment.js';

const REFRESH_COOKIE_NAME = 'refresh_token';

// Security configuration for cookies
const cookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'lax' as const, // Lax protects against CSRF while allowing navigation
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
  path: '/',
};

export class AuthController {
  async register(req: Request, res: Response): Promise<void> {
    const { email, username, password, role } = req.body;
    const result = await authService.register({ email, username, password, role });

    res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, cookieOptions);

    res.status(201).json({
      success: true,
      message: 'Account registered successfully.',
      data: {
        accessToken: result.accessToken,
        user: result.user,
      },
    });
  }

  async login(req: Request, res: Response): Promise<void> {
    const { email, password } = req.body;
    const result = await authService.login({ email, password });

    res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, cookieOptions);

    res.status(200).json({
      success: true,
      message: 'Logged in successfully.',
      data: {
        accessToken: result.accessToken,
        user: result.user,
      },
    });
  }

  async refresh(req: Request, res: Response): Promise<void> {
    const refreshToken = req.cookies[REFRESH_COOKIE_NAME] || req.body.refreshToken;

    if (!refreshToken) {
      res.status(401).json({
        success: false,
        error: 'Refresh token missing. Please login again.',
      });
      return;
    }

    const { accessToken, newRefreshToken } = await authService.refreshAccessToken(refreshToken);

    res.cookie(REFRESH_COOKIE_NAME, newRefreshToken, cookieOptions);

    res.status(200).json({
      success: true,
      data: {
        accessToken,
      },
    });
  }

  async logout(req: Request, res: Response): Promise<void> {
    const refreshToken = req.cookies[REFRESH_COOKIE_NAME];
    await authService.logout(refreshToken);

    res.clearCookie(REFRESH_COOKIE_NAME, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });

    res.status(200).json({
      success: true,
      message: 'Logged out successfully.',
    });
  }

  async getMe(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthorized.' });
      return;
    }

    const profile = await authService.getProfile(req.user.userId);

    res.status(200).json({
      success: true,
      data: profile,
    });
  }

  async googleAuth(req: Request, res: Response): Promise<void> {
    const { idToken } = req.body;
    if (!idToken) {
      res.status(400).json({ success: false, error: 'Google idToken is required.' });
      return;
    }

    const result = await authService.googleAuth(idToken);

    res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, cookieOptions);

    res.status(200).json({
      success: true,
      message: 'Authenticated successfully with Google.',
      data: {
        accessToken: result.accessToken,
        user: result.user,
      },
    });
  }
}

export const authController = new AuthController();

