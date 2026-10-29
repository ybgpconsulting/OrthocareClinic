import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { build } from 'esbuild';

const outputDirectory = path.resolve('dist');
const prerenderBundle = path.resolve(`.prerender-entry-${process.pid}.mjs`);
const bootstrapData = JSON.parse(
  await readFile(path.resolve('public/site-data.json'), 'utf8')
);

await build({
  entryPoints: ['scripts/prerender-entry.ts'],
  outfile: prerenderBundle,
  bundle: true,
  packages: 'external',
  platform: 'node',
  format: 'esm',
  target: 'node20',
  jsx: 'automatic',
});

try {
  const { App, VIEW_PATHS, PAGE_METADATA, getCanonicalUrl, getRobotsContent } =
    await import(pathToFileURL(prerenderBundle).href);
  const template = await readFile(path.join(outputDirectory, 'index.html'), 'utf8');

  for (const [view, route] of Object.entries(VIEW_PATHS) as Array<[string, string]>) {
    const metadata = PAGE_METADATA[view];
    const initialData = view === 'admin' ? undefined : bootstrapData;
    const markup = renderToString(
      React.createElement(App, { initialData, initialView: view })
    );
    const bootstrap = JSON.stringify({ initialView: view, initialData }).replace(/</g, '\\u003c');
    if (!template.includes('<div id="root"></div>')) {
      throw new Error('Production HTML template is missing the application root');
    }
    let html = template
      .replace('<div id="root"></div>', `<div id="root">${markup}</div>`)
      .replace(/<title>[\s\S]*?<\/title>/, `<title>${metadata.title}</title>`)
      .replace(
        /<meta name="description" content="[^"]*" \/>/,
        `<meta name="description" content="${metadata.description}" />`
      )
      .replace(
        /<meta name="robots" content="[^"]*" \/>/,
        `<meta name="robots" content="${getRobotsContent(view)}" />`
      )
      .replace(
        /<link rel="canonical" href="[^"]*" \/>/,
        `<link rel="canonical" href="${getCanonicalUrl(view)}" />`
      )
      .replace(
        /<meta property="og:title" content="[^"]*" \/>/,
        `<meta property="og:title" content="${metadata.title}" />`
      )
      .replace(
        /<meta property="og:description" content="[^"]*" \/>/,
        `<meta property="og:description" content="${metadata.description}" />`
      )
      .replace(
        /<meta property="og:url" content="[^"]*" \/>/,
        `<meta property="og:url" content="${getCanonicalUrl(view)}" />`
      )
      .replace(
        /<meta name="twitter:title" content="[^"]*" \/>/,
        `<meta name="twitter:title" content="${metadata.title}" />`
      )
      .replace(
        /<meta name="twitter:description" content="[^"]*" \/>/,
        `<meta name="twitter:description" content="${metadata.description}" />`
      )
      .replace(
        '</head>',
        `<script id="clinic-prerender-data" type="application/json">${bootstrap}</script>\n  </head>`
      );
    if (!html.includes('<div id="root">') || !html.includes('clinic-prerender-data')) {
      throw new Error(`Failed to generate complete prerendered HTML for ${view}`);
    }

    const outputFile = route === '/'
      ? path.join(outputDirectory, 'index.html')
      : path.join(outputDirectory, `${route.replace(/^\/|\/$/g, '')}.html`);
    await mkdir(path.dirname(outputFile), { recursive: true });
    await writeFile(outputFile, html);
    console.log(`Prerendered ${view} route to ${outputFile}`);
  }
} finally {
  await unlink(prerenderBundle);
}
