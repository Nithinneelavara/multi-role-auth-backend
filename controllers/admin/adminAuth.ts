// controllers/admin/adminAuth.ts
import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import Admin from '../../models/db/admin';
import User from '../../models/db/user';
import Member from '../../models/db/member';
import Group from '../../models/db/group';
import Message from '../../models/db/message';
import AccessToken from '../../models/db/accessToken';
import RefreshToken from '../../models/db/refreshToken';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET!;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is not defined in .env');
}

export const adminLogin = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, password } = req.body;
    const admin = await Admin.findOne({ email });
    if (!admin) {
      res.status(401).json({ success: false, message: 'Invalid email or password' });
      return;
    }
    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      res.status(401).json({ success: false, message: 'Invalid email or password' });
      return;
    }
    const accessToken = jwt.sign({ id: admin._id, role: 'admin' }, JWT_SECRET, { expiresIn: '1d' });
    const refreshToken = jwt.sign({ id: admin._id }, JWT_SECRET, { expiresIn: '30d' });
    await AccessToken.deleteMany({ userId: admin._id, userType: 'admin' });
    await RefreshToken.deleteMany({ userId: admin._id, userType: 'admin' });
    await AccessToken.create({
      userId: admin._id,
      userType: 'admin',
      token: accessToken,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });
    await RefreshToken.create({
      userId: admin._id,
      userType: 'admin',
      token: refreshToken,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });
    res
      .cookie('adminToken', accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000,
        sameSite: 'strict',
      })
      .cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 30 * 24 * 60 * 60 * 1000,
        sameSite: 'strict',
      })
      .status(200)
      .json({
        success: true,
        message: 'Admin login successful',
        accessToken,
        refreshToken,
        adminId: admin._id,
      });
  } catch (error) {
    next(error);
  }
};

export const adminLogout = async (req: Request, res: Response): Promise<void> => {
  try {
    const accessToken = req.cookies.adminToken;
    const refreshToken = req.cookies.refreshToken;
    if (!accessToken || !refreshToken) {
      res.status(401).json({ success: false, message: 'Tokens missing' });
      return;
    }
    await AccessToken.deleteOne({ token: accessToken });
    await RefreshToken.deleteOne({ token: refreshToken });
    res.clearCookie('adminToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });
    res.status(200).json({
      success: true,
      message: 'Admin logged out successfully. Tokens cleared.',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error during logout',
    });
  }
};

export const getAdminStats = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const [totalUsers, totalMembers, totalGroups] = await Promise.all([
      User.countDocuments(),
      Member.countDocuments(),
      Group.countDocuments(),
    ]);
    const oneMonthAgo = new Date();
    oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);
    const activeUserIds = await Message.distinct('senderId', {
      timestamp: { $gte: oneMonthAgo },
      senderModel: 'User',
    });
    const activeUsersCount = activeUserIds.length;
    res.status(200).json({
      success: true,
      data: {
        totalUsers,
        totalMembers,
        totalGroups,
        activeUsers: activeUsersCount,
      },
    });
  } catch (error) {
    next(error);
  }
};
