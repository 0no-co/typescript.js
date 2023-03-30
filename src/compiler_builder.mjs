import { generateDjb2Hash } from './compiler_sys.mjs';

function getTextHandlingSourceMapForSignature(text, data) {
  return (data == null ? undefined : data.sourceMapUrlPos)
    ? text.substring(0, data.sourceMapUrlPos)
    : text;
}

export function computeSignature(text, host, data) {
  return generateDjb2Hash(getTextHandlingSourceMapForSignature(text, data));
}
