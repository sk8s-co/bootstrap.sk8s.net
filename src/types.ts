export type Component = 'dockerd-kubelet';

export interface BaseScriptData {
  timestamp: string;
  component: Component;
  userAgent: string;
  machineId: string;
  version: string;
  machineToken?: string;
}

export type KubeletData = BaseScriptData;

export interface ParsedUserAgent {
  component: Component | null;
  version: string | null;
  raw: string;
}

export interface ErrorData {
  timestamp: string;
  message: string;
}

export interface SanitizedScriptData {
  component: Component;
  userAgent: string;
  machineId: string;
  version: string;
  machineToken?: string;
}
