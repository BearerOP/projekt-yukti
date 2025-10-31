import express from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validation';
import { AuthService } from '../services/auth.service';

const router = express.Router();

const registerSchema = z.object({
  email: z.string().email(),
  phone: z.string().min(8),
  fullName: z.string().min(2),
  password: z.string().min(6)
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1)
});

const otpSchema = z.object({
  phone: z.string().min(8),
  otp: z.string().min(4)
});

router.post('/register', validate(registerSchema), async (req, res) => {
  try {
    const { email, phone, fullName, password } = req.body;
    const result = await AuthService.register({ email, phone, fullName, password });
    res.status(201).json({ success: true, data: result });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { message: error?.message || 'Registration failed', code: 400 } });
  }
});

router.post('/login', validate(loginSchema), async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await AuthService.login({ email, password });
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(401).json({ success: false, error: { message: error?.message || 'Login failed', code: 401 } });
  }
});

// Original refresh endpoint
router.post('/refresh', validate(refreshSchema), async (req, res) => {
  try {
    const { refreshToken } = req.body;
    const result = await AuthService.refresh(refreshToken);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(401).json({ success: false, error: { message: error?.message || 'Invalid refresh token', code: 401 } });
  }
});

// Mobile client compatibility: /refresh-token returns { token }
router.post('/refresh-token', validate(refreshSchema), async (req, res) => {
  try {
    const { refreshToken } = req.body;
    const result = await AuthService.refresh(refreshToken);
    // Return shape expected by interceptor: { token }
    res.json({ token: result.accessToken });
  } catch (error: any) {
    res.status(401).json({ message: error?.message || 'Invalid refresh token' });
  }
});

// Mobile client compatibility: /verify-otp
router.post('/verify-otp', validate(otpSchema), async (req, res) => {
  try {
    const { phone, otp } = req.body;
    const result = await AuthService.verifyOtp(phone, otp);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { message: error?.message || 'OTP verification failed', code: 400 } });
  }
});

// Mobile client posts /logout without body; accept optional token if provided
router.post('/logout', async (req, res) => {
  try {
    const refreshToken: string | undefined = req.body?.refreshToken;
    await AuthService.logout(refreshToken);
    res.json({ success: true, data: { message: 'Logged out' } });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { message: error?.message || 'Logout failed', code: 400 } });
  }
});

export default router;


