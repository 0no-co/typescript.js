export function closeFileWatcherOf(objWithWatcher) {
  objWithWatcher.watcher.close();
}
