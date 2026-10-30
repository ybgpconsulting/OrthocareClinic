import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { build } from 'esbuild';
import type { ClinicSettings } from '../src/types';
import { getWeeklyHours, WEEKDAYS } from '../src/utils/openingHours';

const outputDirectory = path.resolve('dist');
const prerenderBundle = path.resolve(`.prerender-entry-${process.pid}.mjs`);
const bootstrapData = JSON.parse(
  await readFile(path.resolve('public/site-data.json'), 'utf8')
);

function getClinicStructuredData(
  settings: ClinicSettings,
  view: string,
  metadata: { title: string; description: string; breadcrumbLabel: string },
  canonicalUrl: string
) {
  const daySchemaUrls = new Map(
    WEEKDAYS.map(({ id, label }) => [id, `https://schema.org/${label}`])
  );
  const openingHoursSpecification = getWeeklyHours(settings).flatMap((day) => {
    if (day.isClosed) return [];
    return day.intervals.map(({ open, close }) => ({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: daySchemaUrls.get(day.day),
      opens: open,
      closes: close,
    }));
  });
  const phoneDigits = settings.phone.replace(/\D/g, '');
  const telephone = phoneDigits.startsWith('91') ? `+${phoneDigits}` : `+91${phoneDigits}`;

  const clinicId = 'https://orthocareclinic.in/#clinic';
  const graph: Array<Record<string, unknown>> = [
    {
      '@type': 'WebSite',
      '@id': 'https://orthocareclinic.in/#website',
      url: 'https://orthocareclinic.in/',
      name: settings.clinicName,
      inLanguage: ['en-IN', 'hi-IN'],
      publisher: { '@id': clinicId },
    },
    {
      '@type': 'MedicalClinic',
      '@id': clinicId,
      name: settings.clinicName,
      description: `Physiotherapy and rehabilitation care at ${settings.address}.`,
      medicalSpecialty: 'https://schema.org/Physiotherapy',
      url: 'https://orthocareclinic.in/',
      image: 'https://orthocareclinic.in/images/orthocare-clinic-front.png',
      logo: 'https://orthocareclinic.in/logos/orthocare-logo-horizontal.jpg',
      telephone,
      email: settings.email,
      hasMap: settings.googleMapsUrl,
      address: {
        '@type': 'PostalAddress',
        streetAddress: settings.address,
        addressLocality: settings.city,
        addressRegion: settings.state,
        postalCode: settings.pincode,
        addressCountry: 'IN',
      },
      areaServed: [
        { '@type': 'Place', name: 'Tatiri, Baghpat' },
        { '@type': 'AdministrativeArea', name: 'Baghpat, Uttar Pradesh' },
      ],
      openingHoursSpecification,
      contactPoint: {
        '@type': 'ContactPoint',
        telephone,
        contactType: 'appointments and clinic enquiries',
        availableLanguage: ['English', 'Hindi'],
      },
      employee: {
        '@type': 'Person',
        name: settings.doctorName,
        jobTitle: 'Physiotherapist',
        description: settings.doctorQualifications,
      },
    },
    {
      '@type': view === 'about' ? 'AboutPage' : view === 'contact' ? 'ContactPage' : 'WebPage',
      '@id': `${canonicalUrl}#webpage`,
      url: canonicalUrl,
      name: metadata.title,
      description: metadata.description,
      inLanguage: 'en-IN',
      isPartOf: { '@id': 'https://orthocareclinic.in/#website' },
      about: { '@id': clinicId },
    },
  ];

  if (view !== 'home') {
    graph.push({
      '@type': 'BreadcrumbList',
      '@id': `${canonicalUrl}#breadcrumb`,
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Home',
          item: 'https://orthocareclinic.in/',
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: metadata.breadcrumbLabel,
          item: canonicalUrl,
        },
      ],
    });
  }

  return { '@context': 'https://schema.org', '@graph': graph };
}

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
    const canonicalUrl = getCanonicalUrl(view);
    const schemaJson = initialData
      ? JSON.stringify(
          getClinicStructuredData(
            initialData.settings as ClinicSettings,
            view,
            metadata,
            canonicalUrl
          )
        ).replace(/</g, '\\u003c')
      : null;
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
        `<link rel="canonical" href="${canonicalUrl}" />`
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
        `<meta property="og:url" content="${canonicalUrl}" />`
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
        /<script type="application\/ld\+json">[\s\S]*?<\/script>/,
        schemaJson
          ? `<script type="application/ld+json">${schemaJson}</script>`
          : ''
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
