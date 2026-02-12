import { GetCallerIdentityCommand, STSClient } from '@aws-sdk/client-sts';
import { from, map, NEVER, Observable, of, race, switchMap, timer } from 'rxjs';
import { Request } from 'express';

const aws = (headers: Request['headers']): Observable<string> => {
  if (
    !headers['x-env-aws_access_key_id'] ||
    !headers['x-env-aws_secret_access_key']
  ) {
    return NEVER;
  }

  return from(
    new STSClient({
      credentials: {
        accessKeyId: headers['x-env-aws_access_key_id'] as string,
        secretAccessKey: headers['x-env-aws_secret_access_key'] as string,
        sessionToken:
          (headers['x-env-aws_session_token'] as string | undefined) ||
          undefined,
      },
      region: (headers['x-env-aws_default_region'] as string) || 'us-east-1',
    })
      .send(new GetCallerIdentityCommand({}))
      .then((data) => data.UserId)
      .catch(() => undefined),
  ).pipe(switchMap((userId) => (userId ? of(userId) : NEVER)));
};

const github = (_headers: Request['headers']): Observable<string> => NEVER; // TODO

const jwt = (_headers: Request['headers']): Observable<string> => NEVER; // TODO

const anonymous = (timeout: number) =>
  timer(timeout).pipe(map(() => 'anonymous'));

export const identity = (req: Request): Observable<string> => {
  const { headers } = req;

  return race(aws(headers), github(headers), jwt(headers), anonymous(5000));
};
