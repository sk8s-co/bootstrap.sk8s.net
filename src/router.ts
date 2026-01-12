import { Router, Request, Response, NextFunction } from 'express';
import accepts from 'accepts';
import { generateKubeletScript } from './kubelet';
import { generateReadmeHtml, generateContributingHtml } from './static';
import { isBrowser } from './utils';

/**
 * Router factory that returns configured Express router
 */
export const router = () => {
  const r = Router();

  // Serve CONTRIBUTING.md as HTML
  r.get('/CONTRIBUTING.md', (_req: Request, res: Response) => {
    const html = generateContributingHtml();
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  });

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
        res.json({ message: 'Hello from Express + TypeScript!' });
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
        case 'kubelet':
          script = generateKubeletScript(baseData);
          break;

        case 'controller-manager':
        case 'scheduler':
        case 'cri-dockerd':
        case 'kube-proxy':
          throw new Error(
            `Component '${sanitizedData.component}' is not yet implemented`,
          );

        default: {
          // Exhaustive check - TypeScript will error if we miss a case
          const exhaustiveCheck: never = sanitizedData.component;
          throw new Error(`Unhandled component: ${exhaustiveCheck}`);
        }
      }

      res.setHeader('Content-Type', 'text/x-shellscript');
      res.send(script);
    } catch (error) {
      next(error);
    }
  });

  return r;
};
