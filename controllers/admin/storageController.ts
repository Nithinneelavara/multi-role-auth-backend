// controllers/admin/storageController.ts

import { Request, Response, NextFunction } from 'express';
import { getUploadUrl, getDownloadUrl } from '../../services/storage/s3';

export const generateUploadUrl = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { filename, type } = req.query;

    if (!filename || !type) {
      return res.status(400).json({ message: 'filename and type are required' });
    }

    if (typeof filename !== 'string' || typeof type !== 'string') {
      return res.status(400).json({ message: 'filename and type must be strings' });
    }

    const url = await getUploadUrl(filename, type);
    res.json({ success: true, url });
  } catch (error) {
    next(error);
  }
};

export const generateDownloadUrl = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { filename } = req.query;

    if (!filename || typeof filename !== 'string') {
      return res.status(400).json({ message: 'filename is required and must be a string' });
    }

    const url = await getDownloadUrl(filename);
    res.json({ success: true, url });
  } catch (error) {
    next(error);
  }
};
