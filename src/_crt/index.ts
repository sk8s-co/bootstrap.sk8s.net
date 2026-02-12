import { createHash, webcrypto } from 'crypto';
import {
  AuthorityKeyIdentifierExtension,
  BasicConstraintsExtension,
  ExtendedKeyUsage,
  ExtendedKeyUsageExtension,
  KeyUsageFlags,
  KeyUsagesExtension,
  PemConverter,
  SubjectKeyIdentifierExtension,
  X509CertificateGenerator,
} from '@peculiar/x509';
import { Request, Response } from 'express';
import { firstValueFrom, from, map, NEVER, Observable } from 'rxjs';
import { identity } from './identity';

const { subtle } = webcrypto;

const notBefore = new Date('2025-01-01T00:00:00Z');
const notAfter = new Date('2035-01-01T00:00:00Z');

type Keys = { privateKey: CryptoKey; publicKey: CryptoKey };
type FileResponse = {
  contentType:
    | 'application/x-x509-ca-cert'
    | 'application/x-x509-user-cert'
    | 'application/x-pem-file';
  data: string;
  controller: string;
  subject: string;
  __keys: Keys;
};

const keyPair = async (
  name: string,
  controller?: string,
): Promise<{
  keys: Keys;
  serialNumber: string;
  controller: string;
}> => {
  const secret = process.env.SECRET_STRING || '';

  controller =
    controller ||
    name
      .split('.')
      .map((p) => `DC=${p}`)
      .join(',');

  const seed = createHash('sha256').update(`${name}:${secret}`).digest();

  // PKCS#8 wrapper for Ed25519 private key (prefix + 32-byte seed)
  const pkcs8 = Buffer.concat([
    Buffer.from('302e020100300506032b657004220420', 'hex'),
    seed,
  ]);

  // Import private key from PKCS#8
  const privateKey = await subtle.importKey(
    'pkcs8',
    pkcs8,
    { name: 'Ed25519' },
    true,
    ['sign'],
  );

  // Export as JWK to derive public key
  const jwk = await subtle.exportKey('jwk', privateKey);

  // Import public key from JWK (without private component)
  const publicKey = await subtle.importKey(
    'jwk',
    { kty: jwk.kty, crv: jwk.crv, x: jwk.x },
    { name: 'Ed25519' },
    true,
    ['verify'],
  );

  const serialNumber = createHash('sha256')
    .update(`serial:${name}:${secret}`)
    .digest('hex')
    .slice(0, 32);

  console.log('Generated keys', {
    serialNumber,
    controller,
    publicKey,
    privateKey,
  });

  return { keys: { privateKey, publicKey }, serialNumber, controller };
};

const ca = async (req: Request): Promise<FileResponse> => {
  const host = req.get('host') || 'localhost';
  const { keys, serialNumber, controller } = await keyPair(host);

  const cert = await X509CertificateGenerator.createSelfSigned({
    serialNumber,
    name: `CN=${host},${controller}`,
    notBefore,
    notAfter,
    signingAlgorithm: { name: 'Ed25519' },
    keys,
    extensions: [
      new BasicConstraintsExtension(true, 2, true), // CA: true, path length: 2, critical
      new KeyUsagesExtension(
        KeyUsageFlags.keyCertSign | KeyUsageFlags.cRLSign,
        true,
      ),
      await SubjectKeyIdentifierExtension.create(keys.publicKey),
    ],
  });

  return {
    contentType: 'application/x-x509-ca-cert',
    data: cert.toString('pem'),
    subject: cert.subject,
    controller,
    __keys: keys,
  };
};

const cert = async (req: Request): Promise<FileResponse> => {
  const name = await firstValueFrom(identity(req));
  const { subject, controller, __keys } = await ca(req);
  const { keys, serialNumber } = await keyPair(name, controller);

  const cert = await X509CertificateGenerator.create({
    serialNumber,
    subject: `CN=${name}`,
    issuer: subject,
    notBefore,
    notAfter,
    signingAlgorithm: { name: 'Ed25519' },
    publicKey: keys.publicKey,
    signingKey: __keys.privateKey,
    extensions: [
      new BasicConstraintsExtension(false, undefined, true), // CA: false
      new KeyUsagesExtension(
        KeyUsageFlags.digitalSignature |
          KeyUsageFlags.nonRepudiation |
          KeyUsageFlags.keyAgreement,
        true,
      ),
      new ExtendedKeyUsageExtension(
        [ExtendedKeyUsage.clientAuth, ExtendedKeyUsage.serverAuth],
        true,
      ),
      await SubjectKeyIdentifierExtension.create(keys.publicKey),
      await AuthorityKeyIdentifierExtension.create(__keys.publicKey),
    ],
  });

  return {
    contentType: 'application/x-x509-user-cert',
    data: cert.toString('pem'),
    subject: cert.subject,
    controller,
    __keys: keys,
  };
};

const key = async (req: Request): Promise<FileResponse> => {
  const name = await firstValueFrom(identity(req));
  const { subject, controller } = await ca(req);
  const { keys } = await keyPair(name, controller);

  const pkcs8 = await subtle.exportKey('pkcs8', keys.privateKey);
  const pem = PemConverter.encode(pkcs8, 'PRIVATE KEY');

  return {
    contentType: 'application/x-pem-file',
    data: pem,
    subject,
    controller,
    __keys: keys,
  };
};

export const certRouter = (
  req: Request,
  res: Response,
): Observable<Response> => {
  const paths = {
    '/ca.crt': ca,
    '/client.crt': cert,
    '/client.key': key,
  };

  if (!(req.path in paths)) {
    return NEVER;
  }

  const fn = paths[req.path as keyof typeof paths];

  return from(fn(req)).pipe(
    map((file) => {
      return res
        .header('Content-Type', file.contentType)
        .header(
          'Content-Disposition',
          `attachment; filename="${req.path.slice(1)}"`,
        )
        .send(file.data);
    }),
  );
};
