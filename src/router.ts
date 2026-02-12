import { Router, Request, Response, NextFunction } from 'express';
import { generateKubeconfig } from './kubeconfig';
import { dump } from 'js-yaml';
import { defer, firstValueFrom, map, Observable, race, timer } from 'rxjs';
import { shRouter } from './_sh';
import { bashRouter } from './_bash';
import { yamlRouter } from './_yaml';
import { certRouter } from './_crt';

const withTimeout = (deadline: number, res: Response): Observable<Response> => {
  return defer(() =>
    timer(deadline).pipe(
      map(() => res.status(404).send(`Not Found: ${res.req?.path}`)),
    ),
  );
};

/**
 * Router factory that returns configured Express router
 */
export const router = (timeout: number) => {
  const r = Router();

  r.get('/kubeconfig', (req: Request, res: Response, next: NextFunction) => {
    try {
      const token =
        req.query.token?.toString() ||
        req.header('x-token')?.toString() ||
        req.header('authorization')?.toString().split(' ')[1] ||
        req.header('x-env-machine_token')?.toString() ||
        undefined;

      return res
        .header('Content-Type', 'application/yaml')
        .header('Content-Disposition', 'attachment; filename="kubeconfig"')
        .send(dump(generateKubeconfig(token)));
    } catch (error) {
      next(error);
    }
  });

  r.get(
    /^\/.*\.(sh|yaml|crt|key|pub)$/,
    async (req: Request, res: Response) => {
      try {
        return await firstValueFrom(
          race(
            bashRouter(req, res),
            shRouter(req, res),
            yamlRouter(req, res),
            certRouter(req, res),
            withTimeout(timeout, res),
          ),
        );
      } catch (e) {
        console.error('Error in combined router:', e);
        throw e;
      }
    },
  );

  r.get('/', (req: Request, res: Response) => {
    // TODO Render Readme or something useful
    res.status(404).send('Not Found');
  });

  return r;
};
