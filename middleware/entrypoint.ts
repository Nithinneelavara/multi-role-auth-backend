import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

export const entryLogger = (req: Request, _res: Response, next: NextFunction) => {
  if ((req as any)._entryLogged) return next(); 

  const txtId = uuidv4();
  const startTime = Date.now();
  (req as any).txtId = txtId;
  (req as any).startTime = startTime;
  (req as any)._entryLogged = true;

  console.log(`[ENTRY] [txtId: ${txtId}] ${req.method} ${req.originalUrl} | Start Time: ${new Date(startTime).toISOString()}`);
  next();
};
