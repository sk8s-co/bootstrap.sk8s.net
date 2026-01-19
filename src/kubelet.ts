import * as yaml from 'js-yaml';
import Handlebars from './handlebars';
import { KubeletData, KubeletTemplateData } from './types';
import templateSource from './templates/kubelet.sh.hbs';
import kubeletYamlSource from './templates/kubelet.yaml';
import { generateKubeconfig } from './kubeconfig';
import { dump } from 'js-yaml';

// Load and compile kubelet template once at startup
// Template is bundled directly into the compiled output
const template = Handlebars.compile<KubeletTemplateData>(templateSource);

// Process kubelet.yaml: parse and stringify to ensure valid YAML
const processKubeletYaml = (): string => {
  const parsed = yaml.load(kubeletYamlSource);
  return yaml.dump(parsed);
};

const kubeletYaml = processKubeletYaml();

export const generateKubeletScript = (data: KubeletData): string => {
  let token: string | undefined = undefined;

  if (data.authorization) {
    token = data.authorization.split(' ')[1];
  } else if (data.machineToken) {
    // Use machine token as fallback for kubeconfig generation
    token = data.machineToken;
  }

  // URL and token are not used here
  const kubeconfig = generateKubeconfig(token);

  return template({
    ...data,
    kubeletYaml,
    kubeconfigYaml: dump(kubeconfig),
  });
};
