import { handleApiRequest, type Env as ApiEnvironment } from './api';

interface WorkerEnvironment extends ApiEnvironment {
  ASSETS: {
    fetch(request: Request): Promise<Response>;
  };
}

export default {
  fetch(request: Request, env: WorkerEnvironment): Promise<Response> {
    const { pathname } = new URL(request.url);
    if (pathname === '/api' || pathname.startsWith('/api/')) {
      return handleApiRequest(request, env);
    }

    return env.ASSETS.fetch(request);
  },
};
