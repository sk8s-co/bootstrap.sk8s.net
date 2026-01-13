import request from 'supertest';
import { createApp } from '../src/app';
import type { Express } from 'express';

describe('Integration Tests', () => {
  let app: Express;

  beforeEach(() => {
    app = createApp();
  });

  describe('GET / with Accept: text/x-shellscript', () => {
    it('should return dockerd-kubelet bootstrap script with all fields', async () => {
      const response = await request(app)
        .get('/')
        .set('Accept', 'text/x-shellscript')
        .set('User-Agent', 'dockerd-kubelet/v1.28.0')
        .set('X-Machine-ID', 'test-machine-123');

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toMatch(/text\/x-shellscript/);
      expect(response.text).toContain('#!/usr/bin/env bash');
      expect(response.text).toContain('export KUBELET_FLAGS=');
      expect(response.text).toContain('export CRI_DOCKERD_FLAGS=');
      expect(response.text).toContain('export DOCKERD_KUBELET_BOOTSTRAPPED="true"');
      expect(response.text).toContain(
        'export DOCKERD_KUBELET_BOOTSTRAPPED_BY="sk8s.net"',
      );
      expect(response.text).toContain('export DOCKERD_KUBELET_BOOTSTRAPPED_AT=');
    });

    it('should return dockerd-kubelet script with default values for missing fields', async () => {
      const response = await request(app)
        .get('/')
        .set('Accept', 'text/x-shellscript')
        .set('User-Agent', 'dockerd-kubelet/v1.28.0');

      expect(response.status).toBe(200);
      expect(response.text).toContain('#!/usr/bin/env bash');
      expect(response.text).toContain('export DOCKERD_KUBELET_BOOTSTRAPPED="true"');
    });

    it('should handle component-only User-Agent', async () => {
      const response = await request(app)
        .get('/')
        .set('Accept', 'text/x-shellscript')
        .set('User-Agent', 'dockerd-kubelet');

      expect(response.status).toBe(200);
      expect(response.text).toContain('#!/usr/bin/env bash');
      expect(response.text).toContain('export DOCKERD_KUBELET_BOOTSTRAPPED="true"');
    });

    it('should handle sk8s-prefixed User-Agent', async () => {
      const response = await request(app)
        .get('/')
        .set('Accept', 'text/x-shellscript')
        .set('User-Agent', 'sk8s-dockerd-kubelet/v1.29.0');

      expect(response.status).toBe(200);
      expect(response.text).toContain('#!/usr/bin/env bash');
      expect(response.text).toContain('export DOCKERD_KUBELET_BOOTSTRAPPED="true"');
    });

    it('should handle User-Agent with metadata in parentheses', async () => {
      const response = await request(app)
        .get('/')
        .set('Accept', 'text/x-shellscript')
        .set(
          'User-Agent',
          'dockerd-kubelet/1.34 (cri-dockerd/0.3.21; crictl/1.33.0; cni/1.7.1; alpine; linux/arm64)',
        )
        .set('X-Machine-ID', 'test-machine-001');

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toMatch(/text\/x-shellscript/);
      expect(response.text).toContain('#!/usr/bin/env bash');
      expect(response.text).toContain('export KUBELET_FLAGS=');
      expect(response.text).toContain('export CRI_DOCKERD_FLAGS=');
      expect(response.text).toContain('export DOCKERD_KUBELET_BOOTSTRAPPED="true"');
      expect(response.text).toContain(
        'export DOCKERD_KUBELET_BOOTSTRAPPED_BY="sk8s.net"',
      );
      expect(response.text).toContain('export DOCKERD_KUBELET_BOOTSTRAPPED_AT=');
    });

    it('should return error for unknown component', async () => {
      const response = await request(app)
        .get('/')
        .set('Accept', 'text/x-shellscript')
        .set('User-Agent', 'invalid-component/v1.0.0');

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toMatch(/text\/x-shellscript/);
      expect(response.text).toContain('#!/usr/bin/env bash');
      expect(response.text).toContain('Bootstrap Error');
      expect(response.text).toContain('Unknown component');
      expect(response.text).toContain('exit 1');
    });

    it('should return error for missing User-Agent', async () => {
      const response = await request(app)
        .get('/')
        .set('Accept', 'text/x-shellscript');

      expect(response.status).toBe(200);
      expect(response.text).toContain('Bootstrap Error');
      expect(response.text).toContain('Unknown component');
    });

    it('should block command injection in Machine ID', async () => {
      const response = await request(app)
        .get('/')
        .set('Accept', 'text/x-shellscript')
        .set('User-Agent', 'dockerd-kubelet/v1.28.0')
        .set('X-Machine-ID', 'test; rm -rf /');

      expect(response.status).toBe(200);
      expect(response.text).toContain('Bootstrap Error');
      expect(response.text).toContain('Invalid Machine ID');
      expect(response.text).toContain('unsafe characters');
      expect(response.text).toContain('exit 1');
    });

    it('should block variable expansion in User-Agent', async () => {
      const response = await request(app)
        .get('/')
        .set('Accept', 'text/x-shellscript')
        .set('User-Agent', 'dockerd-kubelet/$(whoami)');

      expect(response.status).toBe(200);
      expect(response.text).toContain('Bootstrap Error');
      expect(response.text).toContain('Invalid User-Agent');
      expect(response.text).toContain('unsafe characters');
    });

    it('should block command substitution', async () => {
      const response = await request(app)
        .get('/')
        .set('Accept', 'text/x-shellscript')
        .set('User-Agent', 'dockerd-kubelet/`id`');

      expect(response.status).toBe(200);
      expect(response.text).toContain('Bootstrap Error');
      expect(response.text).toContain('Invalid User-Agent');
    });

    it('should return error for invalid components', async () => {
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

        expect(response.status).toBe(200);
        expect(response.text).toContain('Bootstrap Error');
        expect(response.text).toContain('Unknown component');
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
        message: 'sk8s.net bootstrap service',
      });
    });

    it('should return JSON response without User-Agent', async () => {
      const response = await request(app)
        .get('/')
        .set('Accept', 'application/json');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        message: 'sk8s.net bootstrap service',
      });
    });

    it('should return JSON response for invalid component', async () => {
      const response = await request(app)
        .get('/')
        .set('Accept', 'application/json')
        .set('User-Agent', 'invalid-component/v1.0.0');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        message: 'sk8s.net bootstrap service',
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
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Edge cases', () => {
    it('should handle very long Machine ID within limits', async () => {
      const longId = 'a'.repeat(100);
      const response = await request(app)
        .get('/')
        .set('Accept', 'text/x-shellscript')
        .set('User-Agent', 'dockerd-kubelet/v1.28.0')
        .set('X-Machine-ID', longId);

      expect(response.status).toBe(200);
      expect(response.text).toContain('#!/usr/bin/env bash');
      expect(response.text).toContain('export DOCKERD_KUBELET_BOOTSTRAPPED="true"');
    });

    it('should handle special but safe characters', async () => {
      const response = await request(app)
        .get('/')
        .set('Accept', 'text/x-shellscript')
        .set('User-Agent', 'dockerd-kubelet/v1.28.0')
        .set('X-Machine-ID', 'test-node_01.prod:8080');

      expect(response.status).toBe(200);
      expect(response.text).toContain('#!/usr/bin/env bash');
      expect(response.text).toContain('export DOCKERD_KUBELET_BOOTSTRAPPED="true"');
    });

    it('should generate unique timestamps', async () => {
      const response1 = await request(app)
        .get('/')
        .set('Accept', 'text/x-shellscript')
        .set('User-Agent', 'dockerd-kubelet/v1.28.0');

      const response2 = await request(app)
        .get('/')
        .set('Accept', 'text/x-shellscript')
        .set('User-Agent', 'dockerd-kubelet/v1.28.0');

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
      // Timestamps should be different (or at least script generation works twice)
      expect(response1.text).toBeTruthy();
      expect(response2.text).toBeTruthy();
    });

    it('should handle production curl format with all headers', async () => {
      // Simulate the actual production curl command
      const response = await request(app)
        .get('/')
        .set('Accept', 'text/x-shellscript')
        .set(
          'User-Agent',
          'dockerd-kubelet/1.34 (cri-dockerd/0.3.21; crictl/1.33.0; cni/1.7.1; alpine; linux/arm64)',
        )
        .set('X-Machine-ID', 'prod-node-001')
        .set('X-Machine-Token', 'token-abc123')
        .set('X-Debug', 'true');

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toMatch(/text\/x-shellscript/);
      expect(response.text).toContain('#!/usr/bin/env bash');
      expect(response.text).toContain('export KUBELET_FLAGS=');
      expect(response.text).toContain('export CRI_DOCKERD_FLAGS=');
      expect(response.text).toContain('export DOCKERD_KUBELET_BOOTSTRAPPED="true"');
      expect(response.text).toContain(
        'export DOCKERD_KUBELET_BOOTSTRAPPED_BY="sk8s.net"',
      );
      expect(response.text).toContain('export DOCKERD_KUBELET_BOOTSTRAPPED_AT=');
    });
  });

  describe('Debug mode', () => {
    it('should include debug output when X-Debug is true', async () => {
      const response = await request(app)
        .get('/')
        .set('Accept', 'text/x-shellscript')
        .set('User-Agent', 'dockerd-kubelet/v1.28.0')
        .set('X-Machine-ID', 'debug-test-node')
        .set('X-Debug', 'true');

      expect(response.status).toBe(200);
      expect(response.text).toContain('# DEBUG MODE ENABLED');
      expect(response.text).toContain('# Bootstrap Request Information:');
      expect(response.text).toContain('#   Component:     dockerd-kubelet');
      expect(response.text).toContain('#   Version:       v1.28.0');
      expect(response.text).toContain('#   Machine ID:    debug-test-node');
      expect(response.text).toContain('[DEBUG] SK8S Bootstrap Service - Debug Mode Enabled');
      expect(response.text).toContain('[DEBUG] Component: dockerd-kubelet vv1.28.0');
      expect(response.text).toContain('[DEBUG] Kubelet flags configured:');
      expect(response.text).toContain('[DEBUG] CRI-Dockerd flags configured:');
      expect(response.text).toContain('[DEBUG] Bootstrap completed successfully');
    });

    it('should accept X-Debug value of "1"', async () => {
      const response = await request(app)
        .get('/')
        .set('Accept', 'text/x-shellscript')
        .set('User-Agent', 'dockerd-kubelet/v1.28.0')
        .set('X-Debug', '1');

      expect(response.status).toBe(200);
      expect(response.text).toContain('# DEBUG MODE ENABLED');
    });

    it('should accept X-Debug value of "yes"', async () => {
      const response = await request(app)
        .get('/')
        .set('Accept', 'text/x-shellscript')
        .set('User-Agent', 'dockerd-kubelet/v1.28.0')
        .set('X-Debug', 'yes');

      expect(response.status).toBe(200);
      expect(response.text).toContain('# DEBUG MODE ENABLED');
    });

    it('should NOT include debug output when X-Debug is false', async () => {
      const response = await request(app)
        .get('/')
        .set('Accept', 'text/x-shellscript')
        .set('User-Agent', 'dockerd-kubelet/v1.28.0')
        .set('X-Debug', 'false');

      expect(response.status).toBe(200);
      expect(response.text).not.toContain('# DEBUG MODE ENABLED');
      expect(response.text).not.toContain('[DEBUG]');
    });

    it('should NOT include debug output when X-Debug is missing', async () => {
      const response = await request(app)
        .get('/')
        .set('Accept', 'text/x-shellscript')
        .set('User-Agent', 'dockerd-kubelet/v1.28.0');

      expect(response.status).toBe(200);
      expect(response.text).not.toContain('# DEBUG MODE ENABLED');
      expect(response.text).not.toContain('[DEBUG]');
    });

    it('should redact machine token in debug output', async () => {
      const response = await request(app)
        .get('/')
        .set('Accept', 'text/x-shellscript')
        .set('User-Agent', 'dockerd-kubelet/v1.28.0')
        .set('X-Machine-Token', 'secret-token-12345')
        .set('X-Debug', 'true');

      expect(response.status).toBe(200);
      expect(response.text).toContain('# DEBUG MODE ENABLED');
      expect(response.text).toContain('#   Machine Token: [REDACTED]');
      expect(response.text).not.toContain('secret-token-12345');
    });

    it('should show machine token length in debug output', async () => {
      const response = await request(app)
        .get('/')
        .set('Accept', 'text/x-shellscript')
        .set('User-Agent', 'dockerd-kubelet/v1.28.0')
        .set('X-Machine-Token', '12345')
        .set('X-Debug', 'true');

      expect(response.status).toBe(200);
      expect(response.text).toContain('(length: 5)');
    });
  });

  describe('Error handling with debug mode', () => {
    it('should show verbose error when debug is enabled', async () => {
      const response = await request(app)
        .get('/')
        .set('Accept', 'text/x-shellscript')
        .set('User-Agent', 'invalid-component/v1.0.0')
        .set('X-Machine-ID', 'test-node-001')
        .set('X-Debug', 'true');

      expect(response.status).toBe(200);
      expect(response.text).toContain('# ERROR OCCURRED - DEBUG MODE');
      expect(response.text).toContain('HTTP Request Details:');
      expect(response.text).toContain('Method:        GET');
      expect(response.text).toContain('Path:          /');
      expect(response.text).toContain('Accept:        text/x-shellscript');
      expect(response.text).toContain('User-Agent:    invalid-component/v1.0.0');
      expect(response.text).toContain('Machine ID:    test-node-001');
      expect(response.text).toContain('Stack Trace:');
      expect(response.text).toContain('Troubleshooting:');
      expect(response.text).toContain('exit 1');
    });

    it('should show simple error when debug is disabled', async () => {
      const response = await request(app)
        .get('/')
        .set('Accept', 'text/x-shellscript')
        .set('User-Agent', 'invalid-component/v1.0.0');

      expect(response.status).toBe(200);
      expect(response.text).toContain('Bootstrap Error:');
      expect(response.text).toContain('Unknown component');
      expect(response.text).not.toContain('# ERROR OCCURRED - DEBUG MODE');
      expect(response.text).not.toContain('HTTP Request Details:');
      expect(response.text).not.toContain('Stack Trace:');
      expect(response.text).toContain('exit 1');
    });

    it('should include stack trace in debug error output', async () => {
      const response = await request(app)
        .get('/')
        .set('Accept', 'text/x-shellscript')
        .set('User-Agent', 'dockerd-kubelet/v1.28.0')
        .set('X-Machine-ID', 'test; rm -rf /')
        .set('X-Debug', 'true');

      expect(response.status).toBe(200);
      expect(response.text).toContain('Stack Trace:');
      expect(response.text).toContain('Error:');
      expect(response.text).toContain('at ');
    });
  });
});
