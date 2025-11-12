import { Request, Response, NextFunction } from 'express';
import { getPinHash } from '../utils/config.js';

export function authenticatePin(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid authorization header' });
    return;
  }

  const providedHash = authHeader.substring(7); // Remove 'Bearer ' prefix
  const expectedHash = getPinHash();

  if (providedHash !== expectedHash) {
    res.status(403).json({ error: 'Invalid PIN' });
    return;
  }

  next();
}
