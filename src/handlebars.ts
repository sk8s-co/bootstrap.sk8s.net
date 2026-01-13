import Handlebars from 'handlebars';

// Register global Handlebars helpers
Handlebars.registerHelper('env', (str: string) => {
  // Convert to uppercase and replace hyphens with underscores for valid bash variable names
  return str ? str.toUpperCase().replace(/-/g, '_') : '';
});

export default Handlebars;
