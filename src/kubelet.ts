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
    clusters: Array<{ cluster: { server: string } }>;
  };

  // TODO: Look up cluster server URL by machine token
  // For now, we leave the server URL empty as it appears in the template
  // Future implementation:
  // if (_machineToken) {
  //   const clusterInfo = await lookupClusterByToken(_machineToken);
  //   parsed.clusters[0].cluster.server = clusterInfo.serverUrl;
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
