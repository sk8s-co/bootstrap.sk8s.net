import { Kubeconfig } from './types';
import { JWTPayload, decodeJwt } from 'jose';

export const generateKubeconfig = (token?: string): Kubeconfig => {
  let issuer = 'https://auth.sk8s.net/';
  let clientId = '';
  let audience = '';
  let subject = '';
  let extraScopes = ['offline_access'];

  try {
    const payload = decodeJwt<JWTPayload>(token || '');
    issuer = `${payload.iss || issuer}`;
    clientId = `${payload.azp || ''}`;
    audience = Array.isArray(payload.aud)
      ? payload.aud[0]
      : `${payload.aud || ''}`;
    subject = `${payload.sub || ''}`;
    extraScopes.push(
      ...(Array.isArray(payload.permissions)
        ? payload.permissions.map((p) => `${p}`)
        : []),
    );
  } catch (e) {
    // TODO: Attempt to refresh with the token
    console.warn('Failed to decode JWT token:', e);
  }

  const user = `${issuer}#${subject}`;
  let context = audience;
  try {
    const url = new URL(audience);
    context = url.hostname;
  } catch {
    // Ignore URL parse errors, use audience as-is
  }

  return {
    apiVersion: 'v1',
    kind: 'Config',
    'current-context': context,
    contexts: [
      {
        name: context,
        context: {
          cluster: context,
          user,
        },
      },
    ],
    clusters: [
      {
        name: context,
        cluster: {
          server: audience,
        },
      },
    ],
    users: [
      {
        name: user,
        user: {
          exec: {
            apiVersion: 'client.authentication.k8s.io/v1',
            command: 'kubectl',
            args: [
              'oidc-login',
              'get-token',
              '--oidc-use-access-token',
              `--oidc-issuer-url=${issuer}`,
              `--oidc-client-id=${clientId}`,
              `--oidc-extra-scope=${extraScopes.join(',')}`,
              `--oidc-auth-request-extra-params=audience=${audience}`,
            ],
            env: [
              { name: 'OIDC_ISS', value: issuer },
              { name: 'OIDC_AZP', value: clientId },
              { name: 'OIDC_AUD', value: audience },
              { name: 'OIDC_SUB', value: subject },
              { name: 'OIDC_SCP', value: extraScopes.join(',') },
            ],
            interactiveMode: 'IfAvailable',
            provideClusterInfo: false,
          },
        },
      },
    ],
  };
};
