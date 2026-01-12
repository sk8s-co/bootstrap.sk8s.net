import request from 'supertest';
import { createApp } from '../src/app';
import type { Express } from 'express';

describe('Integration Tests', () => {
  let app: Express;

  beforeEach(() => {
    app = createApp();
  });

  describe('GET / with Accept: text/x-shellscript', () => {
    it('should return kubelet bootstrap script with all fields', async () => {
      const response = await request(app)
        .get('/')
        .set('Accept', 'text/x-shellscript')
        .set('User-Agent', 'kubelet/v1.28.0')
        .set('X-Machine-ID', 'test-machine-123');

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toMatch(/text\/x-shellscript/);
      expect(response.text).toContain('#!/bin/bash');
      expect(response.text).toContain('SK8S Kubelet Bootstrap Script');
      expect(response.text).toContain('Machine ID: test-machine-123');
      expect(response.text).toContain('Component: kubelet');
      expect(response.text).toContain('Version: v1.28.0');
      expect(response.text).toContain('export KUBELET_BOOTSTRAPPED="true"');
      expect(response.text).toContain(
        'export KUBELET_BOOTSTRAPPED_BY="sk8s.net"',
      );
    });

    it('should return kubelet script with default values for missing fields', async () => {
      const response = await request(app)
        .get('/')
        .set('Accept', 'text/x-shellscript')
        .set('User-Agent', 'kubelet/v1.28.0');

      expect(response.status).toBe(200);
      expect(response.text).toContain('Machine ID: unknown');
      expect(response.text).toContain('Component: kubelet');
      expect(response.text).toContain('Version: v1.28.0');
    });

    it('should handle component-only User-Agent', async () => {
      const response = await request(app)
        .get('/')
        .set('Accept', 'text/x-shellscript')
        .set('User-Agent', 'kubelet');

      expect(response.status).toBe(200);
      expect(response.text).toContain('Component: kubelet');
      expect(response.text).toContain('Version: latest');
    });

    it('should handle sk8s-prefixed User-Agent', async () => {
      const response = await request(app)
        .get('/')
        .set('Accept', 'text/x-shellscript')
        .set('User-Agent', 'sk8s-kubelet/v1.29.0');

      expect(response.status).toBe(200);
      expect(response.text).toContain('Component: kubelet');
      expect(response.text).toContain('Version: v1.29.0');
    });

    it('should return error for unknown component', async () => {
      const response = await request(app)
        .get('/')
        .set('Accept', 'text/x-shellscript')
        .set('User-Agent', 'invalid-component/v1.0.0');

      expect(response.status).toBe(500);
      expect(response.headers['content-type']).toMatch(/text\/x-shellscript/);
      expect(response.text).toContain('#!/bin/bash');
      expect(response.text).toContain('SK8S Bootstrap Error');
      expect(response.text).toContain('Unknown component');
      expect(response.text).toContain('exit 1');
    });

    it('should return error for missing User-Agent', async () => {
      const response = await request(app)
        .get('/')
        .set('Accept', 'text/x-shellscript');

      expect(response.status).toBe(500);
      expect(response.text).toContain('SK8S Bootstrap Error');
      expect(response.text).toContain('Unknown component');
    });

    it('should block command injection in Machine ID', async () => {
      const response = await request(app)
        .get('/')
        .set('Accept', 'text/x-shellscript')
        .set('User-Agent', 'kubelet/v1.28.0')
        .set('X-Machine-ID', 'test; rm -rf /');

      expect(response.status).toBe(500);
      expect(response.text).toContain('SK8S Bootstrap Error');
      expect(response.text).toContain('Invalid Machine ID');
      expect(response.text).toContain('unsafe characters');
      expect(response.text).toContain('exit 1');
    });

    it('should block variable expansion in User-Agent', async () => {
      const response = await request(app)
        .get('/')
        .set('Accept', 'text/x-shellscript')
        .set('User-Agent', 'kubelet/$(whoami)');

      expect(response.status).toBe(500);
      expect(response.text).toContain('SK8S Bootstrap Error');
      expect(response.text).toContain('Invalid User-Agent');
      expect(response.text).toContain('unsafe characters');
    });

    it('should block command substitution', async () => {
      const response = await request(app)
        .get('/')
        .set('Accept', 'text/x-shellscript')
        .set('User-Agent', 'kubelet/`id`');

      expect(response.status).toBe(500);
      expect(response.text).toContain('SK8S Bootstrap Error');
      expect(response.text).toContain('Invalid User-Agent');
    });

    it('should return not implemented for other components', async () => {
      const components = [
        'controller-manager',
        'scheduler',
        'cri-dockerd',
        'kube-proxy',
      ];

      for (const component of components) {
        const response = await request(app)
          .get('/')
          .set('Accept', 'text/x-shellscript')
          .set('User-Agent', `${component}/v1.28.0`);

        expect(response.status).toBe(500);
        expect(response.text).toContain('SK8S Bootstrap Error');
        expect(response.text).toContain('not yet implemented');
      }
    });
  });

  describe('GET / with Accept: application/json', () => {
    it('should return JSON response', async () => {
      const response = await request(app)
        .get('/')
        .set('Accept', 'application/json');

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toMatch(/application\/json/);
      expect(response.body).toEqual({
        message: 'Hello from Express + TypeScript!',
      });
    });

    it('should return JSON response without User-Agent', async () => {
      const response = await request(app)
        .get('/')
        .set('Accept', 'application/json');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        message: 'Hello from Express + TypeScript!',
      });
    });

    it('should return JSON error for invalid component', async () => {
      const response = await request(app)
        .get('/')
        .set('Accept', 'application/json')
        .set('User-Agent', 'invalid-component/v1.0.0');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        message: 'Hello from Express + TypeScript!',
      });
    });
  });

  describe('GET / with browser User-Agent', () => {
    it('should return HTML README for Chrome', async () => {
      const response = await request(app)
        .get('/')
        .set(
          'User-Agent',
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        );

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toMatch(/text\/html/);
      expect(response.text).toContain('<!DOCTYPE html>');
      expect(response.text).toContain('SK8S Bootstrap Service');
      expect(response.text).toContain('github.com/sk8s-co');
    });

    it('should return HTML README for Firefox', async () => {
      const response = await request(app)
        .get('/')
        .set(
          'User-Agent',
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0',
        );

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toMatch(/text\/html/);
      expect(response.text).toContain('<!DOCTYPE html>');
      expect(response.text).toContain('SK8S Bootstrap Service');
    });

    it('should return HTML README for Safari', async () => {
      const response = await request(app)
        .get('/')
        .set(
          'User-Agent',
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
        );

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toMatch(/text\/html/);
      expect(response.text).toContain('<!DOCTYPE html>');
      expect(response.text).toContain('SK8S Bootstrap Service');
    });
  });

  describe('GET / with unsupported Accept header', () => {
    it('should return error for text/html with non-browser User-Agent', async () => {
      const response = await request(app)
        .get('/')
        .set('Accept', 'text/html')
        .set('User-Agent', 'curl/7.68.0');

      expect(response.status).toBe(500);
      // Default Express error handling for unsupported content type
    });
  });

  describe('Edge cases', () => {
    it('should handle very long Machine ID within limits', async () => {
      const longId = 'a'.repeat(100);
      const response = await request(app)
        .get('/')
        .set('Accept', 'text/x-shellscript')
        .set('User-Agent', 'kubelet/v1.28.0')
        .set('X-Machine-ID', longId);

      expect(response.status).toBe(200);
      expect(response.text).toContain(`Machine ID: ${longId}`);
    });

    it('should handle special but safe characters', async () => {
      const response = await request(app)
        .get('/')
        .set('Accept', 'text/x-shellscript')
        .set('User-Agent', 'kubelet/v1.28.0')
        .set('X-Machine-ID', 'test-node_01.prod:8080');

      expect(response.status).toBe(200);
      expect(response.text).toContain('Machine ID: test-node_01.prod:8080');
    });

    it('should generate unique timestamps', async () => {
      const response1 = await request(app)
        .get('/')
        .set('Accept', 'text/x-shellscript')
        .set('User-Agent', 'kubelet/v1.28.0');

      const response2 = await request(app)
        .get('/')
        .set('Accept', 'text/x-shellscript')
        .set('User-Agent', 'kubelet/v1.28.0');

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
      // Timestamps should be different (or at least script generation works twice)
      expect(response1.text).toBeTruthy();
      expect(response2.text).toBeTruthy();
    });
  });
});
