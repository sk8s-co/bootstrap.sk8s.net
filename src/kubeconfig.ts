import { load, dump } from 'js-yaml';
import { Kubeconfig } from './types';
import kubeconfigYaml from './templates/kubeconfig.yaml';
import { JWTPayload, decodeJwt } from 'jose';

export const generateKubeconfig = (url: string, token: string): string => {
  let host = '';
  try {
    host = new URL(url).hostname;
  } catch {
    // Ignore URL parsing errors
  }

  let user = '';
  try {
    const payload = decodeJwt<JWTPayload>(token);
    user = payload.sub || '';
  } catch {
    // Ignore JWT decoding errors
  }

  const parsed = load(kubeconfigYaml) as Kubeconfig;
  parsed['current-context'] = host;
  parsed.clusters[0].name = host;
  parsed.clusters[0].cluster.server = url;
  parsed.contexts[0].name = host;
  parsed.contexts[0].context.cluster = host;
  parsed.users[0].name = user;
  parsed.users[0].user.token = token;
  parsed.contexts[0].context.user = user;

  return dump(parsed, {});
};
