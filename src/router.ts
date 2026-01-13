import { Router, Request, Response, NextFunction } from 'express';
import accepts from 'accepts';
import { generateKubeletScript } from './kubelet';
import { generateReadmeHtml } from './static';
import { isBrowser } from './utils';

/**
 * Router factory that returns configured Express router
 */
export const router = () => {
  const r = Router();

  r.get('/', (req: Request, res: Response, next: NextFunction) => {
    try {
      // Check if the User-Agent is a browser
      const userAgentHeader = req.get('User-Agent');
      if (isBrowser(userAgentHeader)) {
        const html = generateReadmeHtml();
        res.setHeader('Content-Type', 'text/html');
        res.send(html);
        return;
      }

      const accept = accepts(req);
      const acceptedType = accept.type([
        'text/x-shellscript',
        'application/json',
      ]);

      // Guard: Handle unsupported content types
      if (!acceptedType) {
        throw new Error('Unsupported Accept header');
      }

      // Guard: Return JSON response early for non-shellscript requests
      if (acceptedType === 'application/json') {
        res.json({ message: 'sk8s.net bootstrap service' });
        return;
      }

      // Handle shellscript requests
      if (acceptedType !== 'text/x-shellscript') {
        throw new Error(`Unexpected accepted type: ${acceptedType}`);
      }

      // sanitizedData is guaranteed to exist here due to middleware
      const sanitizedData = req.sanitizedData!;

      const baseData = {
        timestamp: new Date().toISOString(),
        ...sanitizedData,
      };

      // Generate script based on component
      let script: string;

      switch (sanitizedData.component) {
        case 'dockerd-kubelet':
          script = generateKubeletScript(baseData);
          break;
        default:
          throw new Error(`Unknown component: ${sanitizedData.component}`);
      }

      res.setHeader('Content-Type', 'text/x-shellscript');
      res.send(script);
    } catch (error) {
      next(error);
    }
  });

  return r;
};
