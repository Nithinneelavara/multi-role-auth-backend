// project\controllers\admin\storageController.ts
import { Request, Response, NextFunction } from 'express';
import { getUploadUrl, getDownloadUrl } from '../../services/storage';

export const generateUploadUrl = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { filename, type } = req.query;
    if (!filename || !type) {
      return res.status(400).json({ message: 'filename and type are required' });
    }
    const url = await getUploadUrl(filename as string, type as string);
    res.json({ success: true, url });
  } catch (error) {
    next(error);
  }
};

export const generateDownloadUrl = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { filename } = req.query;
    if (!filename) {
      return res.status(400).json({ message: 'filename is required' });
    }
    const url = await getDownloadUrl(filename as string);
    res.json({ success: true, url });
  } catch (error) {
    next(error);
  }
};
