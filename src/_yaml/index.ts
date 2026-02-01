import { Request, Response } from 'express';
import { NEVER, Observable, of } from 'rxjs';

import kubelet from './kubelet.yaml';

export const yamlRouter = (
  req: Request,
  res: Response,
): Observable<Response> => {
  const paths = {
    '/kubelet.yaml': kubelet,
  };

  if (!(req.path in paths)) {
    return NEVER;
  }

  return of(
    res
      .header('Content-Type', 'application/x-yaml')
      .header(
        'Content-Disposition',
        `attachment; filename="${req.path.slice(1)}"`,
      )
      .send(paths[req.path as keyof typeof paths]),
  );
};
