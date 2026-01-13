export type Component = 'dockerd-kubelet';

export interface BaseScriptData {
  timestamp: string;
  component: Component;
  userAgent: string;
  machineId: string;
  version: string;
  machineToken?: string;
  debug: boolean;
}

export type KubeletData = BaseScriptData;

export interface KubeletTemplateData extends KubeletData {
  kubeletYaml: string;
  kubeconfigYaml: string;
}

export interface ParsedUserAgent {
  component: Component | null;
  version: string | null;
  raw: string;
}

export interface ErrorData {
  timestamp: string;
  message: string;
  debug: boolean;
  userAgent?: string;
  machineId?: string;
  requestPath?: string;
  requestMethod?: string;
  acceptHeader?: string;
  stackTrace?: string;
}

export interface SanitizedScriptData {
  component: Component;
  userAgent: string;
  machineId: string;
  version: string;
  machineToken?: string;
  debug: boolean;
}

export interface Kubeconfig {
  'current-context': string;
  clusters: Array<{ name: string; cluster: { server: string } }>;
  users: Array<{ name: string; user: { token: string } }>;
  contexts: Array<{ name: string; context: { cluster: string; user: string } }>;
}
