import jwt from 'jsonwebtoken';

const ACCESS_TTL = '15m';
const REFRESH_TTL = '30d';

export interface JwtUserPayload {
  id: string;
  email: string;
  fullName: string;
}

export function signAccessToken(payload: JwtUserPayload): string {
  return jwt.sign(payload, process.env.JWT_SECRET as string, { expiresIn: ACCESS_TTL });
}

export function signRefreshToken(payload: JwtUserPayload): string {
  return jwt.sign(payload, process.env.REFRESH_TOKEN_SECRET as string, { expiresIn: REFRESH_TTL });
}

export function verifyAccessToken(token: string): JwtUserPayload {
  return jwt.verify(token, process.env.JWT_SECRET as string) as JwtUserPayload;
}

export function verifyRefreshToken(token: string): JwtUserPayload {
  return jwt.verify(token, process.env.REFRESH_TOKEN_SECRET as string) as JwtUserPayload;
}


