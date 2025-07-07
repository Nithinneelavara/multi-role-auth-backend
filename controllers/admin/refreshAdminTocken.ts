import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { promisify } from 'util';

import AccessToken from '../../models/db/accessToken';
import RefreshToken from '../../models/db/refreshToken';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET!;
const verifyToken = (token: string, secret: string): Promise<jwt.JwtPayload> => {
  return new Promise((resolve, reject) => {
    jwt.verify(token, secret, (err, decoded) => {
      if (err) return reject(err);
      resolve(decoded as jwt.JwtPayload);
    });
  });
};

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is not defined');
}

export const refreshAdminToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {

  try {
    const refreshToken = req.cookies?.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({ success: false, message: 'Refresh token missing' });
    }

    const tokenDoc = await RefreshToken.findOne({ token: refreshToken, userType: 'admin' });
    if (!tokenDoc) {
      return res.status(403).json({ success: false, message: 'Invalid refresh token' });
    }

     const decoded = await verifyToken(refreshToken, JWT_SECRET) as jwt.JwtPayload;

    if (!decoded?.id) {
      return res.status(403).json({
        success: false,
        message: 'Invalid or expired refresh token',
      });
    }

    if (tokenDoc.userId.toString() !== decoded.id) {
      return res.status(403).json({
        success: false,
        message: 'Token does not belong to this admin',
      });
    }

    const newAccessToken = jwt.sign({ id: decoded.id, role: 'admin' }, JWT_SECRET, {
      expiresIn: '1d',
    });

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await AccessToken.deleteMany({ userId: decoded.id, userType: 'admin' });
    await AccessToken.create({
      userId: decoded.id,
      userType: 'admin',
      token: newAccessToken,
      expiresAt,
    });

    res.cookie('adminToken', newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000,
      sameSite: 'strict',
    });

    // ✅ Valid return after await flow
    return res.status(200).json({
      success: true,
      message: 'New admin access token issued successfully',
      accessToken: newAccessToken,
    });

  } catch (error) {
    return next(error); // ✅ Safe error handling
  }
};
