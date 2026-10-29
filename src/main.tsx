import { createRoot, hydrateRoot } from 'react-dom/client';
import App from './App.tsx';
import { ClinicBootstrapData } from './context/ClinicContext';
import './index.css';

interface PrerenderBootstrap {
  initialView: string;
  initialData?: ClinicBootstrapData;
}

const root = document.getElementById('root');
if (!root) {
  throw new Error('Application root element was not found');
}

const bootstrapElement = document.getElementById('clinic-prerender-data');
if (bootstrapElement?.textContent) {
  const bootstrap = JSON.parse(bootstrapElement.textContent) as PrerenderBootstrap;
  hydrateRoot(root, <App initialData={bootstrap.initialData} initialView={bootstrap.initialView} />);
} else {
  createRoot(root).render(<App />);
}
