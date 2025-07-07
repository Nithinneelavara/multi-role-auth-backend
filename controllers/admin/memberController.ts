import { Request, Response, NextFunction } from 'express';
import Member from '../../models/db/member';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { parseStandardQueryParams as parseQueryParams, buildSearchFilterQuery, buildProjection, getPagination,} from '../../controllers/generic/utils';
import validator from 'validator';

dotenv.config();
const JWT_SECRET = process.env.JWT_SECRET!;


// ------------------ MEMBER CRUD OPERATIONS ------------------
export const createMember = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, email, password, address } = req.body;

    const exists = await Member.findOne({ email });
    if (exists) return res.status(400).json({ message: 'Email already registered' });

    if (!validator.isEmail(email)) {
      return res.status(400).json({ message: 'Invalid email format.' });
    }

    if (password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters long.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newMember = await Member.create({
      name,
      email,
      password: hashedPassword,
      address
    });

    req.apiResponse = {
         success: true,
         message: "Member Created Succesfullly",
         data: newMember };
    next();
  } catch (error) {
    next(error);
  }
};

//------------------ GETMEMBERS OPERATIONS ------------------
export const getMembers = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      page,
      limit,
      searchTerm,
      searchFields,
      filter = {},
      projection,
    } = parseQueryParams(req.body);

    const { skip } = getPagination(page, limit);

    const dbFilter: any = { ...filter };

    

    // If ID is present in body, validate it
if (req.body.id) {
  if (!mongoose.Types.ObjectId.isValid(req.body.id)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid member ID format.',
    });
  }
  dbFilter._id = new mongoose.Types.ObjectId(req.body.id);
}


    // Add search term if present
    if (searchTerm) {
      Object.assign(dbFilter, buildSearchFilterQuery(searchFields, searchTerm));
    }

    const { projection: cleanProjection, mode } = buildProjection(projection);

   if (projection) {
  const keys = Object.keys(projection);
  const hasInclude = keys.some((key) => projection[key] === 1);
  const hasExclude = keys.some((key) => projection[key] === 0);

  if (hasInclude && hasExclude) {
    return res.status(400).json({
      success: false,
      message: 'Projection cannot mix inclusion and exclusion.',
    });
  }
}

    const totalCount = await Member.countDocuments(dbFilter);
    const members = await Member.find(dbFilter, cleanProjection)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    req.apiResponse = {
      success: true,
      message:
        members.length > 0
          ? req.body.id
            ? 'Member retrieved successfully.'
            : 'Members retrieved successfully.'
          : 'No members found.',
      data: {
        totalCount,
        page,
        limit,
        results: members,
      },
    };

    next();
  } catch (error) {
    next(error);
  }
};

//------------------ updateMember OPERATIONS ------------------
export const updateMember = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const member = await Member.findByIdAndUpdate(req.params.id, req.body, { new: true });
     if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({ message: 'Update data cannot be empty.' });
    }
    if (!member) return res.status(404).json({ message: 'Member not found' });
    req.apiResponse = { 
        success: true,
        message: " Member updated successfully ",
        data: member };
    next();
  } catch (error) {
    next(error);
  }
};


//------------------ deleteMember OPERATIONS ------------------
export const deleteMember = async (req: Request, res: Response, next: NextFunction) => {
  try {
     const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid member ID format' });
    }

    const member = await Member.findByIdAndDelete(id);
    if (!member) return res.status(404).json({ message: 'Member not found' });
   
    req.apiResponse = { success: true, message: 'Member deleted' };
    next();
  } catch (error) {
    next(error);
  }
};


