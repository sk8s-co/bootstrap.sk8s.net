import Handlebars from './handlebars';
import { KubeletData } from './types';
import templateSource from './templates/kubelet.sh.hbs';

// Load and compile kubelet template once at startup
// Template is bundled directly into the compiled output
const template = Handlebars.compile<KubeletData>(templateSource);

export const generateKubeletScript = (data: KubeletData): string => {
  return template(data);
};
