export const ignoredPaths = ["/node_modules/.", "/.git", "/.#"];
export let sys = {};

export function generateDjb2Hash(data) {
    let acc = 5381;
    for (let i = 0; i < data.length; i++) {
        acc = ((acc << 5) + acc) + data.charCodeAt(i);
    }
    return acc.toString();
}

export const FileWatcherEventKind = {
  '0': 'Created',
  '1': 'Changed',
  '2': 'Deleted',
  Created: 0,
  Changed: 1,
  Deleted: 2
};

export const PollingInterval = {
  '250': 'Low',
  '500': 'Medium',
  '2000': 'High',
  High: 2000,
  Medium: 500,
  Low: 250
};

export function setSysLog() {
  return;
}

export const missingFileModifiedTime = new Date(0);
