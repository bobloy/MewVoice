import { Hono } from 'hono';
import type { Env } from '../types';
// Wrangler's "Text" rule in wrangler.json handles .py → string import
// @ts-expect-error -- no type declaration for .py files
import installScript from '../../static/install_voicepack.py';

export const installRoutes = new Hono<{ Bindings: Env }>();

/** Download the install_voicepack.py helper script */
installRoutes.get('/install-script', (c) => {
  return new Response(installScript as string, {
    headers: {
      'Content-Type': 'text/x-python',
      'Content-Disposition': 'attachment; filename="install_voicepack.py"',
    },
  });
});
