import * as fs from 'fs/promises';
import * as path from 'path';
import * as url from 'url';

const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

function createKey(name, code) {
  return name.slice(0, 100) + "_" + code;
}

function convertPropertyName(origName) {
  let result = origName.split("").map(char => {
      if (char === "*") return "_Asterisk";
      if (char === "/") return "_Slash";
      if (char === ":") return "_Colon";
      return /\w/.test(char) ? char : "_";
  }).join("");

  // get rid of all multi-underscores
  result = result.replace(/_+/g, "_");

  // remove any leading underscore, unless it is followed by a number.
  result = result.replace(/^_([^\d])/, "$1");

  // get rid of all trailing underscores.
  result = result.replace(/_$/, "");

  return result;
}

function buildDiagnosticMessageDTs(messageTable) {
  const result = [
    'import { DiagnosticMessage } from "./types";',
    'export declare const Diagnostics: {',
  ];
  messageTable.forEach(({ code }, name) => {
    const propName = convertPropertyName(name);
    result.push(`  ${createKey(propName, code)}: DiagnosticMessage;`);
  });
  result.push('};');
  return result.join('\n');
}

function buildDiagnosticMessageJs(messageTable) {
  const result = [
    'import { DiagnosticCategory, DiagnosticMessage } from "./types";',
    '',
    'function diag(code, category, key, message, reportsUnnecessary, elidedInCompatabilityPyramid, reportsDeprecated) {',
    '  return { code, category, key, message, reportsUnnecessary, elidedInCompatabilityPyramid, reportsDeprecated };',
    '}',
    'export const Diagnostics = {',
  ];
  messageTable.forEach(({ code, category, reportsUnnecessary, elidedInCompatabilityPyramid, reportsDeprecated }, name) => {
    const propName = convertPropertyName(name);
    const argReportsUnnecessary = reportsUnnecessary ? `, /*reportsUnnecessary*/ ${reportsUnnecessary}` : "";
    const argElidedInCompatabilityPyramid = elidedInCompatabilityPyramid ? `${!reportsUnnecessary ? ", /*reportsUnnecessary*/ undefined" : ""}, /*elidedInCompatabilityPyramid*/ ${elidedInCompatabilityPyramid}` : "";
    const argReportsDeprecated = reportsDeprecated ? `${!argElidedInCompatabilityPyramid ? ", /*reportsUnnecessary*/ undefined, /*elidedInCompatabilityPyramid*/ undefined" : ""}, /*reportsDeprecated*/ ${reportsDeprecated}` : "";
    result.push(`  ${propName}: diag(${code}, DiagnosticCategory.${category}, "${createKey(propName, code)}", ${JSON.stringify(name)}${argReportsUnnecessary}${argElidedInCompatabilityPyramid}${argReportsDeprecated}),`);
  });
  result.push('};');
  return result.join('\n');
}

export async function prepareGeneratedFiles() {
  const diagnosticMessagesPath = path.resolve(
    __dirname,
    '../node_modules/ts-src/src/compiler/diagnosticMessages.json'
  );

  const diagnosticMessagesText = await fs.readFile(diagnosticMessagesPath, { encoding: 'utf8' });
  const diagnosticMessagesJson = JSON.parse(diagnosticMessagesText);

  const diagnosticMessages = new Map();
  for (const key in diagnosticMessagesJson) {
      if (Object.hasOwnProperty.call(diagnosticMessagesJson, key)) {
          diagnosticMessages.set(key, diagnosticMessagesJson[key]);
      }
  }

  const jsOutput = buildDiagnosticMessageJs(diagnosticMessages);
  const jsOutputPath = path.resolve(__dirname, '../vendor/compiler/diagnosticInformationMap.generated.js');
  await fs.writeFile(jsOutputPath, jsOutput);

  const dtsOutput = buildDiagnosticMessageDTs(diagnosticMessages);
  const dtsOutputPath = path.resolve(__dirname, '../vendor/compiler/diagnosticInformationMap.generated.d.ts');
  await fs.writeFile(dtsOutputPath, dtsOutput);
}
