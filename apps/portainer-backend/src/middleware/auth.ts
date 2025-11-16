/**
 * @file Authentication middleware for PIN-based bearer token validation
 *
 * This module provides Express middleware that validates incoming requests
 * against a PIN-based Bearer token authentication system. It protects
 * sensitive endpoints like update triggering and history access.
 *
 * Authentication flow:
 * 1. Extracts Authorization header from request
 * 2. Verifies it follows 'Bearer {hash}' format
 * 3. Compares provided hash against expected PIN hash from config
 * 4. Returns 401 for missing/malformed header or 403 for invalid PIN
 * 5. Calls next() to proceed if authentication succeeds
 */

import { Request, Response, NextFunction } from 'express';
import { getPinHash } from '../utils/config.js';

/**
 * Express middleware to authenticate requests using PIN-based Bearer tokens
 *
 * This middleware checks the Authorization header for a Bearer token and
 * validates it against the PIN hash stored in the configuration. Used to
 * protect sensitive API endpoints from unauthorized access.
 *
 * Authentication flow:
 * - Looks for 'Authorization: Bearer {hash}' header
 * - Extracts the hash portion after 'Bearer '
 * - Compares it against the PIN hash from config (getPinHash())
 * - Returns 401 if header is missing or malformed
 * - Returns 403 if the provided hash doesn't match the expected hash
 * - Calls next() if authentication succeeds
 *
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next middleware function
 *
 * @returns {void}
 *
 * @example
 * // Protect a route with PIN authentication
 * app.get('/api/updates', authenticatePin, (req, res) => {
 *   // Handler code - only reached if authentication passes
 * });
 *
 * @example
 * // Example request with valid authentication
 * // Header: Authorization: Bearer abc123def456
 * // (where 'abc123def456' is the PIN hash from config)
 */
export function authenticatePin(req: Request, res: Response, next: NextFunction) {
  // Extract the Authorization header from the request
  const authHeader = req.headers.authorization;

  // Check if Authorization header exists and starts with 'Bearer '
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid authorization header' });
    return;
  }

  // Extract the hash portion after 'Bearer ' prefix (skip first 7 characters)
  const providedHash = authHeader.substring(7);

  // Get the expected PIN hash from configuration
  const expectedHash = getPinHash();

  // Compare provided hash against expected PIN hash
  if (providedHash !== expectedHash) {
    res.status(403).json({ error: 'Invalid PIN' });
    return;
  }

  // Authentication successful - proceed to the next middleware/handler
  next();
}
