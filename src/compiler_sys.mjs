export const ignoredPaths = ["/node_modules/.", "/.git", "/.#"];
export let sys = {};

export function generateDjb2Hash(data) {
    let acc = 5381;
    for (let i = 0; i < data.length; i++) {
        acc = ((acc << 5) + acc) + data.charCodeAt(i);
    }
    return acc.toString();
}

export var FileWatcherEventKind;
(function (FileWatcherEventKind) {
    FileWatcherEventKind[FileWatcherEventKind["Created"] = 0] = "Created";
    FileWatcherEventKind[FileWatcherEventKind["Changed"] = 1] = "Changed";
    FileWatcherEventKind[FileWatcherEventKind["Deleted"] = 2] = "Deleted";
})(FileWatcherEventKind || (FileWatcherEventKind = {}));

export var PollingInterval;
(function (PollingInterval) {
    PollingInterval[PollingInterval["High"] = 2000] = "High";
    PollingInterval[PollingInterval["Medium"] = 500] = "Medium";
    PollingInterval[PollingInterval["Low"] = 250] = "Low";
})(PollingInterval || (PollingInterval = {}));

export function setSysLog() {
  return;
}

export const missingFileModifiedTime = new Date(0);
