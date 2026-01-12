import { isValidComponent, parseUserAgent, sanitizeForBash } from './utils';

describe('sanitizeForBash', () => {
  it('should allow safe alphanumeric strings', () => {
    expect(sanitizeForBash('test123', 'field')).toBe('test123');
  });

  it('should allow dashes', () => {
    expect(sanitizeForBash('test-machine-123', 'field')).toBe(
      'test-machine-123',
    );
  });

  it('should allow underscores', () => {
    expect(sanitizeForBash('test_machine_123', 'field')).toBe(
      'test_machine_123',
    );
  });

  it('should allow dots', () => {
    expect(sanitizeForBash('test.machine.123', 'field')).toBe(
      'test.machine.123',
    );
  });

  it('should allow colons', () => {
    expect(sanitizeForBash('test:machine:123', 'field')).toBe(
      'test:machine:123',
    );
  });

  it('should allow forward slashes', () => {
    expect(sanitizeForBash('test/machine/123', 'field')).toBe(
      'test/machine/123',
    );
  });

  it('should allow version strings', () => {
    expect(sanitizeForBash('v1.28.0', 'Version')).toBe('v1.28.0');
  });

  it('should throw on semicolon (command injection)', () => {
    expect(() => sanitizeForBash('test; rm -rf /', 'Machine ID')).toThrow(
      'Invalid Machine ID: contains unsafe characters. Only alphanumeric, dash, underscore, dot, colon, and forward slash are allowed.',
    );
  });

  it('should throw on dollar sign (variable expansion)', () => {
    expect(() => sanitizeForBash('test$(whoami)', 'field')).toThrow(
      'Invalid field: contains unsafe characters',
    );
  });

  it('should throw on backticks (command substitution)', () => {
    expect(() => sanitizeForBash('test`id`', 'field')).toThrow(
      'Invalid field: contains unsafe characters',
    );
  });

  it('should throw on pipe (command chaining)', () => {
    expect(() => sanitizeForBash('test | cat', 'field')).toThrow(
      'Invalid field: contains unsafe characters',
    );
  });

  it('should throw on ampersand (background execution)', () => {
    expect(() => sanitizeForBash('test & echo hacked', 'field')).toThrow(
      'Invalid field: contains unsafe characters',
    );
  });

  it('should throw on newline (command injection)', () => {
    expect(() => sanitizeForBash('test\nrm -rf /', 'field')).toThrow(
      'Invalid field: contains unsafe characters',
    );
  });

  it('should return empty string for empty input', () => {
    expect(sanitizeForBash('', 'field')).toBe('');
  });
});

describe('isValidComponent', () => {
  it('should return true for kubelet', () => {
    expect(isValidComponent('kubelet')).toBe(true);
  });

  it('should return true for controller-manager', () => {
    expect(isValidComponent('controller-manager')).toBe(true);
  });

  it('should return true for scheduler', () => {
    expect(isValidComponent('scheduler')).toBe(true);
  });

  it('should return true for cri-dockerd', () => {
    expect(isValidComponent('cri-dockerd')).toBe(true);
  });

  it('should return true for kube-proxy', () => {
    expect(isValidComponent('kube-proxy')).toBe(true);
  });

  it('should be case insensitive', () => {
    expect(isValidComponent('KUBELET')).toBe(true);
    expect(isValidComponent('Kubelet')).toBe(true);
  });

  it('should return false for invalid component', () => {
    expect(isValidComponent('invalid')).toBe(false);
  });

  it('should return false for undefined', () => {
    expect(isValidComponent(undefined)).toBe(false);
  });

  it('should return false for empty string', () => {
    expect(isValidComponent('')).toBe(false);
  });
});

describe('parseUserAgent', () => {
  it('should parse standard format: component/version', () => {
    const result = parseUserAgent('kubelet/v1.28.0');
    expect(result.component).toBe('kubelet');
    expect(result.version).toBe('v1.28.0');
    expect(result.raw).toBe('kubelet/v1.28.0');
  });

  it('should parse sk8s prefix format', () => {
    const result = parseUserAgent('sk8s-controller-manager/v1.29.0');
    expect(result.component).toBe('controller-manager');
    expect(result.version).toBe('v1.29.0');
    expect(result.raw).toBe('sk8s-controller-manager/v1.29.0');
  });

  it('should parse component-only format', () => {
    const result = parseUserAgent('kubelet');
    expect(result.component).toBe('kubelet');
    expect(result.version).toBe(null);
    expect(result.raw).toBe('kubelet');
  });

  it('should parse component-only format with sk8s prefix', () => {
    const result = parseUserAgent('sk8s-scheduler');
    expect(result.component).toBe('scheduler');
    expect(result.version).toBe(null);
    expect(result.raw).toBe('sk8s-scheduler');
  });

  it('should return null for invalid component', () => {
    const result = parseUserAgent('invalid/v1.0.0');
    expect(result.component).toBe(null);
    expect(result.version).toBe('v1.0.0');
    expect(result.raw).toBe('invalid/v1.0.0');
  });

  it('should return null for undefined user agent', () => {
    const result = parseUserAgent(undefined);
    expect(result.component).toBe(null);
    expect(result.version).toBe(null);
    expect(result.raw).toBe('');
  });

  it('should return null for empty string', () => {
    const result = parseUserAgent('');
    expect(result.component).toBe(null);
    expect(result.version).toBe(null);
    expect(result.raw).toBe('');
  });

  it('should handle all valid components', () => {
    const components = [
      'kubelet',
      'controller-manager',
      'scheduler',
      'cri-dockerd',
      'kube-proxy',
    ];

    components.forEach((component) => {
      const result = parseUserAgent(`${component}/v1.0.0`);
      expect(result.component).toBe(component);
      expect(result.version).toBe('v1.0.0');
    });
  });
});
