import * as yaml from 'js-yaml';
import Handlebars from './handlebars';
import { KubeletData, KubeletTemplateData } from './types';
import templateSource from './templates/kubelet.sh.hbs';
import kubeletYamlSource from './templates/kubelet.yaml';
import kubeconfigYamlSource from './templates/kubeconfig.yaml';

// Load and compile kubelet template once at startup
// Template is bundled directly into the compiled output
const template = Handlebars.compile<KubeletTemplateData>(templateSource);

// Process kubelet.yaml: parse and stringify to ensure valid YAML
const processKubeletYaml = (): string => {
  const parsed = yaml.load(kubeletYamlSource);
  return yaml.dump(parsed);
};

// Process kubeconfig.yaml: parse and stringify to ensure valid YAML
// In the future, we'll look up the cluster server URL by X-Machine-Token
const processKubeconfigYaml = (_machineToken?: string): string => {
  const parsed = yaml.load(kubeconfigYamlSource) as {
    'current-context': string;
    clusters: Array<{ name: string; cluster: { server: string } }>;
    contexts: Array<{ name: string; context: { cluster: string } }>;
  };

  // TODO: Replace hardcoded values with backend lookup by machine token
  // Hardcoded for now - will be replaced with dynamic lookup
  const clusterUrl =
    'https://be6pj2phtjzantmp5psnvn5cvy0gnhuh.lambda-url.us-east-1.on.aws/';

  // Set cluster name, context name, and server URL to the cluster URL
  parsed['current-context'] = clusterUrl;
  parsed.clusters[0].name = clusterUrl;
  parsed.clusters[0].cluster.server = clusterUrl;
  parsed.contexts[0].name = clusterUrl;
  parsed.contexts[0].context.cluster = clusterUrl;

  // Future implementation:
  // if (_machineToken) {
  //   const clusterInfo = await lookupClusterByToken(_machineToken);
  //   parsed['current-context'] = clusterInfo.serverUrl;
  //   parsed.clusters[0].name = clusterInfo.serverUrl;
  //   parsed.clusters[0].cluster.server = clusterInfo.serverUrl;
  //   parsed.contexts[0].name = clusterInfo.serverUrl;
  //   parsed.contexts[0].context.cluster = clusterInfo.serverUrl;
  // }

  return yaml.dump(parsed);
};

const kubeletYaml = processKubeletYaml();

export const generateKubeletScript = (data: KubeletData): string => {
  // Generate kubeconfig with machine token if available
  const kubeconfigYaml = processKubeconfigYaml(data.machineToken);

  return template({
    ...data,
    kubeletYaml,
    kubeconfigYaml,
  });
};
