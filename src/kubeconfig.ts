import { load, dump } from 'js-yaml';
import { Kubeconfig } from './types';
import kubeconfigYaml from './templates/kubeconfig.yaml';
import { JWTPayload, decodeJwt } from 'jose';

export const generateKubeconfig = (url: string, token: string): string => {
  const payload = decodeJwt<JWTPayload>(token);

  const parsed = load(kubeconfigYaml) as Kubeconfig;
  const host = new URL(url).hostname;
  parsed['current-context'] = host;
  parsed.clusters[0].name = host;
  parsed.clusters[0].cluster.server = url;
  parsed.contexts[0].name = host;
  parsed.contexts[0].context.cluster = host;
  parsed.users[0].name = payload.sub as string;
  parsed.users[0].user.token = token;
  parsed.contexts[0].context.user = payload.sub as string;

  return dump(parsed, {});
};
