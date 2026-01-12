import { marked } from 'marked';
import readmeContent from '../README.md';
import contributingContent from '../CONTRIBUTING.md';
import githubMarkdownCss from './github-markdown.css';

// Load markdown content once at startup
// Content is bundled directly into the compiled output

/**
 * Generates HTML from markdown content with GitHub styling
 */
const generateHtml = (markdownContent: string, title: string): string => {
  const htmlContent = marked(markdownContent);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    ${githubMarkdownCss}

    /* Match body background to GitHub's color scheme */
    @media (prefers-color-scheme: light) {
      body {
        color-scheme: light;
        background-color: #ffffff;
      }
    }

    @media (prefers-color-scheme: dark) {
      body {
        color-scheme: dark;
        background-color: #0d1117;
      }
    }

    body {
      margin: 0;
      padding: 0;
    }

    .markdown-body {
      box-sizing: border-box;
      min-width: 200px;
      max-width: 980px;
      margin: 0 auto;
      padding: 45px;
    }

    @media (max-width: 767px) {
      .markdown-body {
        padding: 15px;
      }
    }
  </style>
</head>
<body>
  <article class="markdown-body">
    ${htmlContent}
  </article>
</body>
</html>`;
};

export const generateReadmeHtml = (): string => {
  return generateHtml(readmeContent, 'SK8S Bootstrap Service');
};

export const generateContributingHtml = (): string => {
  return generateHtml(
    contributingContent,
    'Contributing - SK8S Bootstrap Service',
  );
};
