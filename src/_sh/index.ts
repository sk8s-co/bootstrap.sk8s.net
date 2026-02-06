import { Request, Response } from 'express';
import { NEVER, Observable, of } from 'rxjs';

import dotTunnel from './.tunnel.sh';
import dotKubelet from './.kubelet.sh';
import dotCri from './.cri.sh';
import dotEnv from './.env.sh';
import kubelet from './kubelet.sh';

export const shRouter = (req: Request, res: Response): Observable<Response> => {
  const paths = {
    '/.cri.sh': dotCri,
    '/.env.sh': dotEnv,
    '/.kubelet.sh': dotKubelet,
    '/.tunnel.sh': dotTunnel,
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
