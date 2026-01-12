const fs = require('fs');

/**
 * Jest transformer for .hbs, .md, and .css files
 * Reads file content and exports it as a string module
 * @type {import('@jest/transform').SyncTransformer}
 */
module.exports = {
  /**
   * Transform file content into a JavaScript module
   * @param {string} _sourceText - The source text (unused, we read from file)
   * @param {string} sourcePath - The path to the source file
   * @returns {{ code: string }} The transformed code
   */
  process(_sourceText, sourcePath) {
    // Read the actual file content
    const content = fs.readFileSync(sourcePath, 'utf-8');

    // Return as a CommonJS module that exports the content as default
    return {
      code: `module.exports = ${JSON.stringify(content)};`,
    };
  },
};
