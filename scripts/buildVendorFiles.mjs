import * as path from 'path';
import * as url from 'url';
import { execa } from 'execa';

import { prepareGeneratedFiles } from './prepareGeneratedFiles.mjs';
import { prepareLibraryFiles } from './prepareLibraryFiles.mjs';

const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

async function buildVendorFiles() {
  try {
    const cwd = path.resolve(__dirname, '..');
    await execa(
      'tsc',
      ['-p', 'tsconfig.vendor.json'],
      {
        preferLocal: true,
        localDir: cwd,
        cwd,
      }
    );
  } catch (_error) {
    // noop
  }
}

await buildVendorFiles();
await prepareGeneratedFiles();
await prepareLibraryFiles();
