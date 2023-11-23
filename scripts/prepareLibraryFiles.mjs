import * as fs from 'fs/promises';
import * as path from 'path';
import * as url from 'url';

const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

export async function prepareLibraryFiles() {
  const libPath = path.resolve(
    __dirname,
    '../node_modules/ts-src/lib/'
  );

  const targetPath = path.resolve(
    __dirname,
    '../lib'
  );

  await fs.mkdir(targetPath, { recursive: true });

  const files = await fs.readdir(libPath);
  for (const file of files) {
    if (/\.d\.ts$/.test(file)) {
      const libFile = path.join(libPath, file);
      const outputFile = path.join(targetPath, file);
      await fs.writeFile(outputFile, await fs.readFile(libFile));
    }
  }
}
