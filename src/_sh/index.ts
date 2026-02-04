import { Request, Response } from 'express';
import { NEVER, Observable, of } from 'rxjs';

import dotTunnel from './.tunnel.sh';
import dotKubelet from './.kubelet.sh';
import criDockerd from './cri-dockerd.sh';
import env from './env.sh';
import kubelet from './kubelet.sh';

export const shRouter = (req: Request, res: Response): Observable<Response> => {
  const paths = {
    '/.kubelet.sh': dotKubelet,
    '/.tunnel.sh': dotTunnel,
    '/cri-dockerd.sh': criDockerd,
    '/env.sh': env,
    '/kubelet.sh': kubelet,
  };

  if (!(req.path in paths)) {
    return NEVER;
  }

  return of(
    res
      .header('Content-Type', 'text/x-shellscript')
      .header(
        'Content-Disposition',
        `attachment; filename="${req.path.slice(1)}"`,
      )
      .send(paths[req.path as keyof typeof paths]),
  );
};
