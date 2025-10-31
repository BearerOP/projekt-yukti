import { PrismaClient } from '@prisma/client';
import { comparePassword, hashPassword } from '../utils/encryption';
import { signAccessToken, signRefreshToken } from '../utils/jwt';

const prisma = new PrismaClient();

export class AuthService {
  static async register(params: { email: string; phone: string; fullName: string; password: string; }) {
    const existing = await prisma.user.findFirst({
      where: { OR: [{ email: params.email }, { phone: params.phone }] },
      select: { id: true }
    });
    if (existing) {
      throw new Error('User with email or phone already exists');
    }

    const passwordHash = await hashPassword(params.password);
    const user = await prisma.user.create({
      data: {
        email: params.email,
        phone: params.phone,
        fullName: params.fullName,
        passwordHash
      },
      select: { id: true, email: true, fullName: true }
    });

    const tokens = await this.issueTokens({ id: user.id, email: user.email, fullName: user.fullName });
    return { user, ...tokens };
  }

  static async login(params: { email: string; password: string; }) {
    const user = await prisma.user.findUnique({
      where: { email: params.email },
      select: { id: true, email: true, fullName: true, passwordHash: true }
    });
    if (!user) throw new Error('Invalid credentials');
    const valid = await comparePassword(params.password, user.passwordHash);
    if (!valid) throw new Error('Invalid credentials');

    const tokens = await this.issueTokens({ id: user.id, email: user.email, fullName: user.fullName });
    return { user: { id: user.id, email: user.email, fullName: user.fullName }, ...tokens };
  }

  static async refresh(refreshToken: string) {
    const stored = await prisma.refreshToken.findUnique({ where: { token: refreshToken }, select: { userId: true, expiresAt: true } });
    if (!stored || stored.expiresAt < new Date()) {
      throw new Error('Invalid refresh token');
    }
    const user = await prisma.user.findUnique({ where: { id: stored.userId }, select: { id: true, email: true, fullName: true } });
    if (!user) throw new Error('User not found');
    const tokens = await this.issueTokens({ id: user.id, email: user.email, fullName: user.fullName });
    return { user, ...tokens };
  }

  static async logout(refreshToken?: string) {
    if (refreshToken) {
      await prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
    }
    return { success: true };
  }

  static async verifyOtp(phone: string, otp: string) {
    // Simple stub: accept 123456; mark user as verified
    if (otp !== '123456') {
      throw new Error('Invalid OTP');
    }
    const user = await prisma.user.findFirst({ where: { phone }, select: { id: true } });
    if (!user) throw new Error('User not found');
    await prisma.user.update({ where: { id: user.id }, data: { isVerified: true } });
    return { success: true };
  }

  private static async issueTokens(user: { id: string; email: string; fullName: string; }) {
    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user);
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await prisma.refreshToken.create({ data: { userId: user.id, token: refreshToken, expiresAt } });
    return { accessToken, refreshToken };
  }
}


