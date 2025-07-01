//controllers\user\userAuth.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import User from '../../models/db/user';
import AccessToken from '../../models/db/accessToken';
import RefreshToken from '../../models/db/refreshToken';
import OtpToken from '../../models/db/otpToken';
import { sendOtpEmail } from '../../services/Email/nodemailer';

dotenv.config();
const JWT_SECRET = process.env.JWT_SECRET!;
if (!JWT_SECRET) throw new Error('JWT_SECRET is not defined');

// ------------------ USER LOGIN ------------------
export const userLogin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      res.status(401).json({ success: false, message: 'Invalid email or password' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      res.status(401).json({ success: false, message: 'Invalid email or password' });
      return;
    }

    const accessToken = jwt.sign({ id: user._id, role: 'user' }, JWT_SECRET, { expiresIn: '1d' });
    const refreshToken = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '30d' });

    const accessExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 1 day
    const refreshExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    await AccessToken.findOneAndUpdate(
      { userId: user._id, userType: 'user' },
      { token: accessToken, expiresAt: accessExpiresAt },
      { upsert: true, new: true }
    );

    await RefreshToken.findOneAndUpdate(
      { userId: user._id, userType: 'user' },
      { token: refreshToken, expiresAt: refreshExpiresAt },
      { upsert: true, new: true }
    );

    res
      .cookie('userToken', accessToken, {
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
        message: 'User login successful',
        accessToken,
        refreshToken,
        userId: user._id,
      });
  } catch (error) {
    next(error);
  }
};

// ------------------ USER LOGOUT ------------------
export const userLogout = async (req: Request, res: Response): Promise<void> => {
  try {
    const accessToken = req.cookies.userToken;
    const refreshToken = req.cookies.refreshToken;

    if (!accessToken || !refreshToken) {
      res.status(401).json({ success: false, message: 'Tokens missing' });
      return;
    }

    await AccessToken.deleteOne({ token: accessToken, userType: 'user' });
    await RefreshToken.deleteOne({ token: refreshToken, userType: 'user' });

    res.clearCookie('userToken', {
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
      message: 'User logged out successfully. Tokens cleared.',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error during logout',
    });
  }
};

// ------------------ GET LOGGED-IN USER DATA ------------------
export const getUserData = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user;

    if (!user || !('_id' in user)) {
      res.status(401).json({ success: false, message: 'Unauthorized access' });
      return;
    }

    const userData = await User.findById(user._id).select('-password');

    if (!userData) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'User data fetched successfully',
      data: userData,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ------------------ FORGOT PASSWORD ------------------
export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Email does not exist in our records.',
      });
    }

    // Step 2: Generate OTP and expiry
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Step 3: Upsert OTP
    await OtpToken.findOneAndUpdate(
      { email },
      { email, otp, expiresAt },
      { upsert: true, new: true }
    );

    // Step 4: Send OTP
    await sendOtpEmail(email, otp);

    res.status(200).json({
      success: true,
      message: 'OTP sent successfully to the registered email.',
    });

  } catch (error) {
    console.error('Error in forgotPassword:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Email, OTP, and new password are required.',
      });
    }

    // Lookup OTP (plain match)
    const otpEntry = await OtpToken.findOne({ email, otp });

    if (!otpEntry) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP.' });
    }

    if (otpEntry.expiresAt < new Date()) {
      return res.status(400).json({ success: false, message: 'OTP has expired.' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    await OtpToken.deleteOne({ email }); // Cleanup OTP

    res.status(200).json({ success: true, message: 'Password has been reset successfully.' });
  } catch (error) {
    console.error('Error in resetPassword:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};