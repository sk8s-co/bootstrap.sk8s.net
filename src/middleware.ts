import { Request, Response, NextFunction } from 'express';
import accepts from 'accepts';
import Handlebars from './handlebars';
import { ErrorData, SanitizedScriptData } from './types';
import { parseUserAgent, sanitizeForBash, isBrowser } from './utils';
import errorTemplateSource from './templates/error.sh.hbs';

// Extend Express Request type to include sanitized data
declare module 'express-serve-static-core' {
  interface Request {
    sanitizedData?: SanitizedScriptData;
  }
}

// Load and compile error template once at startup
// Template is bundled directly into the compiled output
const errorTemplate = Handlebars.compile<ErrorData>(errorTemplateSource);

/**
 * Middleware factory that returns middleware to parse and sanitize request data
 * Only processes requests accepting text/x-shellscript
 * Attaches sanitized data to req.sanitizedData
 */
export const sanitized = () => {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      // Skip sanitization for browser requests
      const userAgentHeader = req.get('User-Agent');
      if (isBrowser(userAgentHeader)) {
        next();
        return;
      }

      // Only sanitize for shellscript requests
      const accept = accepts(req);
      const acceptedType = accept.type([
        'text/x-shellscript',
        'application/json',
      ]);

      // Skip sanitization for non-shellscript requests
      if (acceptedType !== 'text/x-shellscript') {
        next();
        return;
      }

      // Parse User-Agent header (already retrieved above)
      const parsedUA = parseUserAgent(userAgentHeader);

      // Guard: Reject requests without valid component
      if (!parsedUA.component) {
        throw new Error(
          'Unknown component. User-Agent must specify a valid component.',
        );
      }

      // Sanitize user-controlled fields
      const machineId = req.get('X-Machine-ID') || 'unknown';
      const version = parsedUA.version || 'latest';

      req.sanitizedData = {
        component: parsedUA.component,
        userAgent: sanitizeForBash(parsedUA.raw, 'User-Agent'),
        machineId: sanitizeForBash(machineId, 'Machine ID'),
        machineToken: req.get('X-Machine-Token') || undefined,
        version: sanitizeForBash(version, 'Version'),
      };

      next();
    } catch (error) {
      next(error);
    }
  };
};

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
) => {
  console.error('Error:', err.message);
  console.error('Stack:', err.stack);

  const accept = accepts(req);
  const acceptedType = accept.type(['text/x-shellscript', 'application/json']);

  switch (acceptedType) {
    case 'text/x-shellscript': {
      // Return error as a bash script that exits with non-zero status
      const errorData: ErrorData = {
        timestamp: new Date().toISOString(),
        message: err.message,
      };
      const errorScript = errorTemplate(errorData);
      res.status(200).setHeader('Content-Type', 'text/x-shellscript');
      res.send(errorScript);
      break;
    }

    case 'application/json':
    default:
      res.status(500).json({
        error: 'Internal Server Error',
        message: err.message,
      });
      break;
  }
};
