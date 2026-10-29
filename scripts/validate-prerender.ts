import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { PAGE_METADATA, getCanonicalUrl, getRobotsContent } from '../src/seo';
import { VIEW_PATHS } from '../src/context/ClinicContext';
import { getWeeklyHours, WEEKDAYS } from '../src/utils/openingHours';
import type { ClinicSettings } from '../src/types';

interface StructuredHours {
  '@type': string;
  dayOfWeek: string;
  opens: string;
  closes: string;
}

interface StructuredGraphEntry {
  '@type'?: string;
  name?: string;
  telephone?: string;
  email?: string;
  address?: {
    streetAddress?: string;
    postalCode?: string;
  };
  employee?: {
    name?: string;
    description?: string;
  };
  openingHoursSpecification?: StructuredHours[];
}

const outputDirectory = path.resolve('dist');
const siteData = JSON.parse(
  await readFile(path.resolve('public/site-data.json'), 'utf8')
) as { settings: ClinicSettings };
const routes = Object.entries(VIEW_PATHS) as Array<[string, string]>;
const publicRoutes = routes.filter(([view]) => view !== 'admin');

function getMetaContent(html: string, kind: 'name' | 'property', key: string): string {
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = html.match(new RegExp(`<meta\\s+${kind}="${escapedKey}"\\s+content="([^"]*)"\\s*\\/?>`));
  assert.ok(match, `Missing ${kind} meta tag ${key}`);
  return match[1];
}

function getJsonLd(html: string): { '@graph': StructuredGraphEntry[] } {
  const match = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  assert.ok(match, 'Missing JSON-LD script');
  return JSON.parse(match[1]);
}

for (const [view, route] of routes) {
  const outputFile = route === '/'
    ? path.join(outputDirectory, 'index.html')
    : path.join(outputDirectory, `${route.slice(1)}.html`);
  const html = await readFile(outputFile, 'utf8');
  const metadata = PAGE_METADATA[view];

  assert.match(html, /<div id="root">[\s\S]+<\/div>/, `${route} has no prerendered root content`);
  assert.match(html, new RegExp(`<title>${metadata.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}<\\/title>`));
  assert.equal(getMetaContent(html, 'name', 'description'), metadata.description);
  assert.equal(getMetaContent(html, 'name', 'robots'), getRobotsContent(view));
  assert.equal(
    html.match(/<link rel="canonical" href="([^"]*)" \/>/)?.[1],
    getCanonicalUrl(view),
    `${route} canonical URL`
  );
  assert.equal(getMetaContent(html, 'property', 'og:title'), metadata.title);
  assert.equal(getMetaContent(html, 'property', 'og:description'), metadata.description);
  assert.equal(getMetaContent(html, 'property', 'og:url'), getCanonicalUrl(view));
  assert.equal(getMetaContent(html, 'name', 'twitter:title'), metadata.title);
  assert.equal(getMetaContent(html, 'name', 'twitter:description'), metadata.description);

  const bootstrapTag = html.match(/<script id="clinic-prerender-data" type="application\/json">([\s\S]*?)<\/script>/);
  assert.ok(bootstrapTag, `${route} is missing the hydration data`);
  const bootstrap = JSON.parse(bootstrapTag[1]);
  assert.equal(bootstrap.initialView, view);

  if (view === 'admin') {
    assert.equal(bootstrap.initialData, undefined);
    assert.doesNotMatch(html, /application\/ld\+json/);
    continue;
  }

  assert.ok(bootstrap.initialData, `${route} is missing clinic bootstrap data`);
  const graph = getJsonLd(html)['@graph'];
  const clinic = graph.find((entry) => entry['@type'] === 'MedicalClinic');
  assert.ok(clinic, `${route} is missing the MedicalClinic schema`);
  assert.equal(clinic.name, siteData.settings.clinicName);
  assert.equal(clinic.telephone, '+918864849409');
  assert.equal(clinic.email, siteData.settings.email);
  assert.ok(clinic.address);
  assert.equal(clinic.address.streetAddress, siteData.settings.address);
  assert.equal(clinic.address.postalCode, '250609');
  assert.ok(clinic.employee);
  assert.equal(clinic.employee.name, siteData.settings.doctorName);
  assert.equal(clinic.employee.description, siteData.settings.doctorQualifications);

  const expectedHours = getWeeklyHours(siteData.settings)
    .filter((day) => !day.isClosed)
    .flatMap((day) => day.intervals.map(({ open, close }) => ({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: `https://schema.org/${WEEKDAYS.find(({ id }) => id === day.day)?.label}`,
      opens: open,
      closes: close,
    })));
  assert.ok(clinic.openingHoursSpecification);
  assert.deepEqual(clinic.openingHoursSpecification, expectedHours, `${route} schema hours`);
  assert.equal(clinic.openingHoursSpecification.length, 6);
  assert.equal(clinic.openingHoursSpecification.find((hours) =>
    hours.dayOfWeek === 'https://schema.org/Saturday'
  )?.closes, '14:00');
  assert.equal(
    clinic.openingHoursSpecification.some((hours) =>
      hours.dayOfWeek === 'https://schema.org/Sunday'
    ),
    false
  );
}

const contactHtml = await readFile(path.join(outputDirectory, 'contact.html'), 'utf8');
for (const visibleDetail of [
  'Main Road, Aggarwal Mandi Tatiri, Baghpat, Uttar Pradesh 250609',
  '8864849409',
  siteData.settings.email,
  siteData.settings.doctorName,
  '9:00 AM',
  '8:00 PM',
  '2:00 PM',
  'Closed',
]) {
  assert.ok(contactHtml.includes(visibleDetail), `Contact route is missing visible detail: ${visibleDetail}`);
}

const sitemap = await readFile(path.join(outputDirectory, 'sitemap.xml'), 'utf8');
const sitemapUrls = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1]);
assert.deepEqual(
  sitemapUrls.sort(),
  publicRoutes.map(([view]) => getCanonicalUrl(view)).sort(),
  'Sitemap must list every public prerendered route and exclude admin'
);

console.log(`Validated ${routes.length} prerendered routes, route metadata, clinic schema, hours, and sitemap.`);
