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

  it('should allow parentheses and semicolons when allowMetadata is true', () => {
    expect(
      sanitizeForBash(
        'dockerd-kubelet/1.34 (cri-dockerd/0.3.21; crictl/1.33.0)',
        'User-Agent',
        true,
      ),
    ).toBe('dockerd-kubelet/1.34 (cri-dockerd/0.3.21; crictl/1.33.0)');
  });

  it('should throw on parentheses when allowMetadata is false', () => {
    expect(() => sanitizeForBash('test(value)', 'field', false)).toThrow(
      'Invalid field: contains unsafe characters',
    );
  });

  it('should throw on semicolons when allowMetadata is false', () => {
    expect(() => sanitizeForBash('test;value', 'field', false)).toThrow(
      'Invalid field: contains unsafe characters',
    );
  });
});

describe('isValidComponent', () => {
  it('should return true for dockerd-kubelet', () => {
    expect(isValidComponent('dockerd-kubelet')).toBe(true);
  });

  it('should be case insensitive', () => {
    expect(isValidComponent('DOCKERD-KUBELET')).toBe(true);
    expect(isValidComponent('Dockerd-Kubelet')).toBe(true);
  });

  it('should return false for invalid component', () => {
    expect(isValidComponent('invalid')).toBe(false);
    expect(isValidComponent('kubelet')).toBe(false);
    expect(isValidComponent('controller-manager')).toBe(false);
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
    const result = parseUserAgent('dockerd-kubelet/v1.28.0');
    expect(result.component).toBe('dockerd-kubelet');
    expect(result.version).toBe('v1.28.0');
    expect(result.raw).toBe('dockerd-kubelet/v1.28.0');
  });

  it('should parse format with metadata in parentheses', () => {
    const result = parseUserAgent(
      'dockerd-kubelet/1.34 (cri-dockerd/0.3.21; crictl/1.33.0; cni/1.7.1; alpine; linux/arm64)',
    );
    expect(result.component).toBe('dockerd-kubelet');
    expect(result.version).toBe('1.34');
    expect(result.raw).toBe(
      'dockerd-kubelet/1.34 (cri-dockerd/0.3.21; crictl/1.33.0; cni/1.7.1; alpine; linux/arm64)',
    );
  });

  it('should parse format with version prefix', () => {
    const result = parseUserAgent('dockerd-kubelet/v1.34.5');
    expect(result.component).toBe('dockerd-kubelet');
    expect(result.version).toBe('v1.34.5');
    expect(result.raw).toBe('dockerd-kubelet/v1.34.5');
  });

  it('should parse sk8s prefix format', () => {
    const result = parseUserAgent('sk8s-dockerd-kubelet/v1.29.0');
    expect(result.component).toBe('dockerd-kubelet');
    expect(result.version).toBe('v1.29.0');
    expect(result.raw).toBe('sk8s-dockerd-kubelet/v1.29.0');
  });

  it('should parse component-only format', () => {
    const result = parseUserAgent('dockerd-kubelet');
    expect(result.component).toBe('dockerd-kubelet');
    expect(result.version).toBe(null);
    expect(result.raw).toBe('dockerd-kubelet');
  });

  it('should parse component-only format with sk8s prefix', () => {
    const result = parseUserAgent('sk8s-dockerd-kubelet');
    expect(result.component).toBe('dockerd-kubelet');
    expect(result.version).toBe(null);
    expect(result.raw).toBe('sk8s-dockerd-kubelet');
  });

  it('should return null component for invalid component', () => {
    const result = parseUserAgent('invalid/v1.0.0');
    expect(result.component).toBe(null);
    expect(result.version).toBe('v1.0.0');
    expect(result.raw).toBe('invalid/v1.0.0');
  });

  it('should return null component for kubelet (not dockerd-kubelet)', () => {
    const result = parseUserAgent('kubelet/v1.28.0');
    expect(result.component).toBe(null);
    expect(result.version).toBe('v1.28.0');
    expect(result.raw).toBe('kubelet/v1.28.0');
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
});
