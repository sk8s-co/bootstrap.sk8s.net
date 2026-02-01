import request from 'supertest';
import { createApp } from '../src/app';
import { type Express } from 'express';

describe('Integration Tests', () => {
  let app: Express;

  beforeEach(() => {
    app = createApp();
  });

  describe('GET /kubeconfig', () => {
    it('should return kubeconfig', async () => {
      const response = await request(app).get('/kubeconfig');
      expect(response.status).toBe(200);
      expect(response.header['content-disposition']).toBe(
        'attachment; filename="kubeconfig"',
      );
    });
  });

  describe('GET /install.sh', () => {
    it('should return install.sh', async () => {
      const response = await request(app).get('/install.sh');
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toBe('text/x-sh; charset=utf-8');
    });
  });

  describe('GET /kubelet.sh', () => {
    it('should return kubelet.sh', async () => {
      const response = await request(app).get('/kubelet.sh');
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toBe(
        'text/x-shellscript; charset=utf-8',
      );
      expect(response.header['content-disposition']).toBe(
        'attachment; filename="kubelet.sh"',
      );
    });
  });

  describe('GET /does-not-exist.sh', () => {
    it('should return 404', async () => {
      const response = await request(app).get('/does-not-exist.sh');
      expect(response.status).toBe(404);
      expect(response.text).toBe('Not Found: /does-not-exist.sh');
    });
  });

  describe('GET /does-not-exist.yaml', () => {
    it('should return 404', async () => {
      const response = await request(app).get('/does-not-exist.yaml');
      expect(response.status).toBe(404);
      expect(response.text).toBe('Not Found: /does-not-exist.yaml');
    });
  });
});
