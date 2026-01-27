import { Router, Request, Response, NextFunction } from 'express';
import accepts from 'accepts';
import { generateKubeletScript } from './kubelet';
import { generateReadmeHtml } from './static';
import { isBrowser } from './utils';
import { generateKubeconfig } from './kubeconfig';
import { dump } from 'js-yaml';
import criDockerdScript from './templates/cri-dockerd.sh';
import envScript from './templates/env.sh';

/**
 * Router factory that returns configured Express router
 */
export const router = () => {
  const r = Router();

  r.get('/kubeconfig', (req: Request, res: Response, next: NextFunction) => {
    try {
      const token =
        req.query.token?.toString() ||
        req.header('x-token')?.toString() ||
        req.header('authorization')?.toString().split(' ')[1] ||
        undefined;

      return res
        .header('Content-Type', 'application/yaml')
        .header('Content-Disposition', 'attachment; filename="kubeconfig.yaml"')
        .send(dump(generateKubeconfig(token)));
    } catch (error) {
      next(error);
    }
  });

  r.get(
    '/cri-dockerd.sh',
    (req: Request, res: Response, _next: NextFunction) => {
      res
        .header('Content-Type', 'text/x-shellscript')
        .header(
          'Content-Disposition',
          `attachment; filename="${req.path.slice(1)}"`,
        )
        .send(criDockerdScript);
    },
  );

  r.get('/env.sh', (req: Request, res: Response, _next: NextFunction) => {
    res
      .header('Content-Type', 'text/x-shellscript')
      .header(
        'Content-Disposition',
        `attachment; filename="${req.path.slice(1)}"`,
      )
      .send(envScript);
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
        res.json({ message: 'sk8s.net bootstrap service' });
        return;
      }

      // Handle shellscript requests
      if (acceptedType !== 'text/x-shellscript') {
        throw new Error(`Unexpected accepted type: ${acceptedType}`);
      }

      // Generate script based on component
      let script: string;

      switch (req.sanitizedData?.component) {
        case 'dockerd-kubelet':
          script = generateKubeletScript({
            timestamp: new Date().toISOString(),
            ...req.sanitizedData,
          });
          break;
        default:
          throw new Error(`Unknown component: ${req.sanitizedData?.component}`);
      }

      res.setHeader('Content-Type', 'text/x-shellscript');
      res.send(script);
    } catch (error) {
      next(error);
    }
  });

  return r;
};
