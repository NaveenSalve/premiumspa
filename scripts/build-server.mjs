import { build } from 'esbuild';
import fs from 'fs';

await build({
  entryPoints: ['server.ts'],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  packages: 'external',
  outfile: 'dist-server/server.cjs',
  logLevel: 'info',
});

if (fs.existsSync('netlify/functions/api.ts')) {
  await build({
    entryPoints: ['netlify/functions/api.ts'],
    bundle: true,
    platform: 'node',
    format: 'cjs',
    packages: 'external',
    outfile: 'dist-functions/api.js',
    logLevel: 'info',
  });
}