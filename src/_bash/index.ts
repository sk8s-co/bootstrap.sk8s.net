import { Request, Response } from 'express';
import { NEVER, Observable, of } from 'rxjs';

import install from './install.sh';
import etag from 'etag';

export const bashRouter = (
  req: Request,
  res: Response,
): Observable<Response> => {
  const paths = {
    '/install.sh': install,
  };

  if (!(req.path in paths)) {
    return NEVER;
  }

  const content = paths[req.path as keyof typeof paths];
  const maxAge = 300; // 5 minutes in seconds
  const eTag = etag(content);

  // Check for ETag match
  if (req.header('If-None-Match') === eTag) {
    return of(res.status(304).end());
  }

  return of(
    res
      .header('Content-Type', 'text/x-sh')
      .header('ETag', eTag)
      .header('Cache-Control', `no-cache, max-age=${maxAge}`)
      .header('Expires', new Date(Date.now() + maxAge * 1000).toUTCString())
      .send(content),
  );
};
