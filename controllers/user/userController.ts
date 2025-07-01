import { NextFunction, Request, Response } from 'express';
import mongoose from 'mongoose';
import User from '../../models/db/user';
import bcrypt from 'bcryptjs';
import {  parseStandardQueryParams, buildSearchFilterQuery, getPagination, buildProjection, } from "../generic/utils";

// CREATE USER
export const createUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const existingUser = await User.findOne({ email: req.body.email });
    if (existingUser) {
      req.apiResponse = {
        success: false,
        message: 'Email already in use',
        error: { email: 'Email already exists' }
      };
      return next();
    }

    const { userName, email, password, ...rest } = req.body;

    // Hash the password before saving
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      userName,
      email,
      password: hashedPassword,
      ...rest
    });

    req.apiResponse = {
      success: true,
      message: 'User created successfully',
      data: user
    };
    next();

  } catch (error: any) {
    console.error('[ERROR]', error);

    if (error.name === 'ValidationError') {
      req.apiResponse = {
        success: false,
        message: 'Validation failed',
        error: error.errors
      };
      return next();
    }

    if (error.code === 11000) {
      req.apiResponse = {
        success: false,
        message: 'Duplicate key error',
        error: error.keyValue
      };
      return next();
    }

    req.apiResponse = {
      success: false,
      message: 'Internal server error',
      error
    };
    next();
  }
};

// GET ALL USERS
export const getAllUsers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, pagination, search, filter = {}, projection = {} } = req.body || {};

    // Return specific user if userId is provided
    if (userId) {
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid userId',
        });
      }

      const { projection: singleProjection } = buildProjection(projection);
      const user = await User.findById(userId).select(singleProjection);

      req.apiResponse = {
        success: true,
        message: user ? 'User retrieved successfully' : 'User not found',
        data: user || {},
      };
      return next();
    }

    // Handle search, pagination, and projection
    const {
      page,
      limit,
      searchTerm,
      searchFields,
    } = parseStandardQueryParams(req.body);

    const searchFilter = buildSearchFilterQuery(searchFields, searchTerm);
    const query = { ...filter, ...searchFilter };
    const { skip, limit: safeLimit } = getPagination(page, limit);
    const { projection: mongoProjection } = buildProjection(projection);

    const totalCount = await User.countDocuments(query);
    const users = await User.find(query)
      .select(mongoProjection)
      .skip(skip)
      .limit(safeLimit);

    req.apiResponse = {
      success: true,
      message: 'Users retrieved successfully',
      data: {
        totalCount,
        page,
        limit: safeLimit,
        users,
      },
    };

    next();
  } catch (error) {
    console.error('[GET USERS ERROR]', error);
    req.apiResponse = {
      success: false,
      message: 'Internal server error',
      error,
    };
    next();
  }
};


// UPDATE USER
export const updateUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      req.apiResponse = {
        success: false,
        message: 'Invalid user ID format'
      };
      return next();
    }

    const user = await User.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    if (!user) {
      req.apiResponse = {
        success: false,
        message: 'User not found'
      };
      return next();
    }

    req.apiResponse = {
      success: true,
      message: 'User updated successfully',
      data: user
    };
    next();

  } catch (error: any) {
    console.error('[ERROR]', error);

    if (error.name === 'ValidationError') {
      req.apiResponse = {
        success: false,
        message: 'Validation failed',
        error: error.errors
      };
      return next();
    }

    req.apiResponse = {
      success: false,
      message: 'Internal server error',
      error
    };
    next();
  }
};

// DELETE USER
export const deleteUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      req.apiResponse = {
        success: false,
        message: 'Invalid user ID format'
      };
      return next();
    }

    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      req.apiResponse = {
        success: false,
        message: 'User not found'
      };
      return next();
    }

    req.apiResponse = {
      success: true,
      message: 'User deleted successfully'
    };
    next();

  } catch (error) {
    console.error('[ERROR]', error);
    req.apiResponse = {
      success: false,
      message: 'Internal server error',
      error
    };
    next();
  }
};
