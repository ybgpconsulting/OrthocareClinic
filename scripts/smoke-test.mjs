import path from 'node:path';
import { fileURLToPath } from 'node:url';

const routes = [
  { path: '/', title: 'Orthocare Physiotherapy Clinic | Baghpat' },
  { path: '/treatments', title: 'Physiotherapy Treatments in Baghpat | Orthocare' },
  { path: '/about', title: 'About Orthocare Physiotherapy Clinic | Baghpat' },
  { path: '/gallery', title: 'Clinic Gallery | Orthocare Physiotherapy Clinic, Baghpat' },
  { path: '/contact', title: 'Contact Orthocare Physiotherapy Clinic | Baghpat' },
  { path: '/faqs', title: 'Physiotherapy FAQs | Orthocare Clinic, Baghpat' },
  { path: '/privacy-policy', title: 'Privacy Policy | Orthocare Physiotherapy Clinic' },
];

const imagePath = '/images/responsive/orthocare-clinic-front-480.webp';
const apiChecks = [
  { path: '/api/settings', kind: 'object' },
  { path: '/api/content', kind: 'object' },
  { path: '/api/services', kind: 'array' },
  { path: '/api/gallery', kind: 'array' },
  { path: '/api/faqs', kind: 'array' },
];

async function fetchChecked(url) {
  let lastError;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
      if (!response.ok) throw new Error(`${url} returned HTTP ${response.status}`);
      return response;
    } catch (error) {
      lastError = error;
      if (attempt === 0) await new Promise((resolve) => setTimeout(resolve, 750));
    }
  }
  throw lastError;
}

export async function runSmokeTest(baseUrl) {
  const base = new URL(baseUrl);
  if (base.username || base.password || base.search || base.hash) {
    throw new Error('Smoke-test URL must not contain credentials, query parameters, or a fragment.');
  }
  if (base.protocol !== 'https:' && base.hostname !== 'localhost' && base.hostname !== '127.0.0.1') {
    throw new Error('Smoke-test URL must use HTTPS unless it targets localhost.');
  }

  const root = base.href.replace(/\/+$/, '');
  const healthResponse = await fetchChecked(`${root}/api/health`);
  const health = await healthResponse.json();
  if (health.status !== 'ok') {
    throw new Error('Health endpoint did not report status "ok".');
  }
  console.log('PASS API health');

  for (const route of routes) {
    const response = await fetchChecked(`${root}${route.path}`);
    const html = await response.text();
    const title = html.match(/<title>([^<]+)<\/title>/i)?.[1];
    if (title !== route.title) {
      throw new Error(`${route.path} returned an unexpected page title.`);
    }
    console.log(`PASS route ${route.path}`);
  }

  for (const check of apiChecks) {
    const response = await fetchChecked(`${root}${check.path}`);
    const data = await response.json();
    const validShape = check.kind === 'array'
      ? Array.isArray(data)
      : data !== null && typeof data === 'object' && !Array.isArray(data);
    if (!validShape) {
      throw new Error(`${check.path} returned an unexpected JSON shape.`);
    }
    console.log(`PASS ${check.path}`);
  }

  const imageResponse = await fetchChecked(`${root}${imagePath}`);
  if (!imageResponse.headers.get('content-type')?.toLowerCase().includes('image/webp')) {
    throw new Error(`${imagePath} did not return a WebP image.`);
  }
  await imageResponse.arrayBuffer();
  console.log('PASS responsive WebP asset');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const baseUrl = process.env.SMOKE_BASE_URL;
  if (!baseUrl) {
    console.error('Set SMOKE_BASE_URL to the deployed site URL.');
    process.exitCode = 1;
  } else {
    runSmokeTest(baseUrl).catch((error) => {
      console.error(`Smoke test failed: ${error.message}`);
      process.exitCode = 1;
    });
  }
}
