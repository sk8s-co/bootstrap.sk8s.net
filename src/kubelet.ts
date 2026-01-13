import * as yaml from 'js-yaml';
import Handlebars from './handlebars';
import { KubeletData, KubeletTemplateData } from './types';
import templateSource from './templates/kubelet.sh.hbs';
import kubeletYamlSource from './templates/kubelet.yaml';

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
  return template({
    ...data,
    kubeletYaml,
  });
};
