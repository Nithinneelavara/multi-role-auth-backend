import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import AccessToken from '../../models/db/accessToken';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET!;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is not defined');
}

export const refreshUserToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      res.status(401).json({ success: false, message: 'Refresh token missing' });
      return;
    }

    // Decode and verify the refresh token
    jwt.verify(refreshToken, JWT_SECRET, async (err: any, decoded: any) => {
      if (err || !decoded?.id) {
        return res.status(403).json({ success: false, message: 'Invalid or expired refresh token' });
      }

      // Validate refresh token existence in DB
      const storedToken = await AccessToken.findOne({ userId: decoded.id, userType: 'user' });
      if (!storedToken) {
        return res.status(403).json({ success: false, message: 'No session found for this user' });
      }

      // Issue new access token
      const newAccessToken = jwt.sign({ id: decoded.id, role: 'user' }, JWT_SECRET, { expiresIn: '1d' });
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

      // Update access token in DB
      storedToken.token = newAccessToken;
      storedToken.expiresAt = expiresAt;
      await storedToken.save();

      // Set new token in cookie
      res.cookie('userToken', newAccessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000,
        sameSite: 'strict',
      });

      res.status(200).json({
        success: true,
        message: 'New user access token issued successfully',
        accessToken: newAccessToken,
      });
    });
  } catch (error) {
    next(error);
  }
};
