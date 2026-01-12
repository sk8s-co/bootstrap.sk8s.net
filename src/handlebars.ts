import Handlebars from 'handlebars';

// Register global Handlebars helpers
Handlebars.registerHelper('uppercase', (str: string) => {
  return str ? str.toUpperCase() : '';
});

export default Handlebars;
