import { Request, Response, NextFunction } from 'express';
import Member from '../../models/db/member';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import AccessToken from '../../models/db/accessToken';
import RefreshToken from '../../models/db/refreshToken';
import OtpToken from '../../models/db/otpToken';
import { sendOtpEmail } from '../../services/Email/nodemailer';
import validator from "validator"; // ensure this is imported


dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET!;
if (!JWT_SECRET) throw new Error('JWT_SECRET is not defined in .env');

// ------------------ LOGIN ------------------
export const memberLogin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password } = req.body;

    const member = await Member.findOne({ email });
    if (!member) {
      res.status(401).json({ success: false, message: 'Invalid email or password' });
      return;
    }

    const isMatch = await bcrypt.compare(password, member.password);
    if (!isMatch) {
      res.status(401).json({ success: false, message: 'Invalid email or password' });
      return;
    }

    if (!email) {
   res.status(400).json({ success: false, message: 'Email is required' });
   return
}
if (!validator.isEmail(email)) {
   res.status(400).json({ success: false, message: 'Invalid email format' });
   return
}
if (!password) {
   res.status(400).json({ success: false, message: 'Password is required' });
   return
}
    const accessToken = jwt.sign({ id: member._id, role: 'member' }, JWT_SECRET, { expiresIn: '1d' });
    const refreshToken = jwt.sign({ id: member._id }, JWT_SECRET, { expiresIn: '30d' });

    const expiresAtAccess = new Date(Date.now() + 24 * 60 * 60 * 1000);  // 1 day
    const expiresAtRefresh = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
    
    await AccessToken.findOneAndUpdate(
      { userId: member._id, userType: 'member' },
      { token: accessToken, expiresAt: expiresAtAccess },
      { upsert: true, new: true }
    );

    await RefreshToken.findOneAndUpdate(
      { userId: member._id, userType: 'member' },
      { token: refreshToken, expiresAt: expiresAtRefresh },
      { upsert: true, new: true }
    );

    res
      .cookie('memberToken', accessToken, {
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
        message: 'Member login successful',
        accessToken,
        refreshToken,
        memberId: member._id,
      });
  } catch (error) {
    next(error);
  }
};

// ------------------ LOGOUT ------------------
export const memberLogout = async (req: Request, res: Response): Promise<void> => {
  try {
    const accessToken = req.cookies.memberToken;
    const refreshToken = req.cookies.refreshToken;

    if (!accessToken || !refreshToken) {
      res.status(401).json({ success: false, message: 'Tokens missing' });
      return;
    }

    await AccessToken.deleteOne({ token: accessToken });
    await RefreshToken.deleteOne({ token: refreshToken });

    res.clearCookie('memberToken', {
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
      message: 'Member logged out successfully. Tokens cleared.',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error during logout',
    });
  }
};

// ------------------ FORGOT PASSWORD ------------------
export const memberForgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required',
      });
    }

    if (!validator.isEmail(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format',
      });
    }
    // Step 1: Check if member exists
    const member = await Member.findOne({ email });

    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Email does not exist in our records.',
      });
    }

    // Step 2: Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Step 3: Store OTP in DB
    await OtpToken.findOneAndUpdate(
      { email },
      { email, otp, expiresAt },
      { upsert: true, new: true }
    );

    // Step 4: Send OTP via email
    await sendOtpEmail(email, otp);

    // Step 5: Send response
    res.status(200).json({
      success: true,
      message: 'OTP sent successfully to the registered email.',
      otp,
    });

  } catch (error) {
    console.error('Error in memberForgotPassword:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ------------------ RESET PASSWORD ------------------
export const memberResetPassword = async (req: Request, res: Response) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Email, OTP, and new password are required.',
      });
    }
    

    const otpEntry = await OtpToken.findOne({ email, otp });

    if (!otpEntry || otpEntry.expiresAt < new Date()) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP.' });
    }

    const member = await Member.findOne({ email });
    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found.' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    member.password = hashedPassword;
    await member.save();

    await OtpToken.deleteOne({ email });

    res.status(200).json({ success: true, message: 'Password has been reset successfully.' });
  } catch (error) {
    console.error('Error in memberResetPassword:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};