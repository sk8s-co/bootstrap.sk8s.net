import { UAParser } from 'ua-parser-js';
import { Component, ParsedUserAgent } from './types';

/**
 * Checks if the User-Agent is a web browser
 */
export const isBrowser = (userAgent: string | undefined): boolean => {
  if (!userAgent) return false;

  const parser = new UAParser(userAgent);
  const result = parser.getResult();

  // Check if it's a known browser
  const browserNames = [
    'Chrome',
    'Firefox',
    'Safari',
    'Edge',
    'Opera',
    'IE',
    'Brave',
    'Vivaldi',
    'Samsung Browser',
  ];

  if (
    result.browser.name &&
    browserNames.some((name) =>
      result.browser.name?.toLowerCase().includes(name.toLowerCase()),
    )
  ) {
    return true;
  }

  // Fallback: check for common browser patterns
  const browserPatterns = [
    /mozilla/i,
    /chrome/i,
    /safari/i,
    /firefox/i,
    /edge/i,
    /opera/i,
  ];

  return browserPatterns.some((pattern) => pattern.test(userAgent));
};

/**
 * Sanitizes a string for safe use in bash scripts
 * Only allows alphanumeric, dash, underscore, dot, colon, forward slash, and optionally parentheses/semicolons/spaces
 * Throws error if string contains potentially dangerous characters
 */
export const sanitizeForBash = (
  value: string,
  fieldName: string,
  allowMetadata = false,
): string => {
  if (!value) return value;

  // For metadata fields (like raw User-Agent), allow additional safe characters
  const safePattern = allowMetadata
    ? /^[a-zA-Z0-9._:/\-() ;]+$/
    : /^[a-zA-Z0-9._:/-]+$/;

  if (!safePattern.test(value)) {
    throw new Error(
      `Invalid ${fieldName}: contains unsafe characters. Only alphanumeric, dash, underscore, dot, colon, and forward slash are allowed.`,
    );
  }

  return value;
};

export const isValidComponent = (
  value: string | undefined,
): value is Component => {
  if (!value) return false;
  const validComponents: Component[] = ['dockerd-kubelet'];
  return validComponents.includes(value.toLowerCase() as Component);
};

export const parseUserAgent = (
  userAgent: string | undefined,
): ParsedUserAgent => {
  if (!userAgent) {
    return { component: null, version: null, raw: '' };
  }

  // First, try to parse with UAParser for standard User-Agent strings
  const parser = new UAParser(userAgent);
  const result = parser.getResult();

  // Check if this is a custom sk8s format: "component/version" or "sk8s-component/version"
  // Examples:
  // - "kubelet/v1.28.0"
  // - "sk8s-controller-manager/v1.29.0"
  // - "dockerd-kubelet/1.34 (cri-dockerd/0.3.21; crictl/1.33.0; cni/1.7.1; alpine; linux/arm64)"
  const customMatch = userAgent.match(/(?:sk8s-)?([^/]+)\/([^\s(]+)/);

  if (customMatch) {
    const [, componentStr, version] = customMatch;
    const component = isValidComponent(componentStr)
      ? (componentStr.toLowerCase() as Component)
      : null;

    return { component, version, raw: userAgent };
  }

  // Fallback: try to extract from browser/engine name if it's a standard UA
  if (result.browser.name) {
    const browserName = result.browser.name.toLowerCase();
    const component = isValidComponent(browserName)
      ? (browserName as Component)
      : null;

    return {
      component,
      version: result.browser.version || null,
      raw: userAgent,
    };
  }

  // Check if the User-Agent is just a component name without version
  // Examples: "kubelet", "sk8s-controller-manager"
  const componentOnly = userAgent.replace(/^sk8s-/, '');
  if (isValidComponent(componentOnly)) {
    return {
      component: componentOnly.toLowerCase() as Component,
      version: null,
      raw: userAgent,
    };
  }

  return { component: null, version: null, raw: userAgent };
};
