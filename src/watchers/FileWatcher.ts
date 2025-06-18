import { watch, FSWatcher } from 'chokidar';
import { EventEmitter } from 'events';
import debounce from 'debounce';
import { FileChange, Config } from '../types/index.js';

export class FileWatcher extends EventEmitter {
  private watcher: FSWatcher | null = null;
  private config: Config;
  private changeQueue: FileChange[] = [];
  private processChanges: () => void;

  constructor(config: Config) {
    super();
    this.config = config;
    this.processChanges = debounce(this.handleChanges.bind(this), config.debounceMs);
  }

  start(): void {
    if (this.watcher) {
      console.log('File watcher is already running');
      return;
    }

    const watchPatterns = this.config.testSuites.flatMap((suite) =>
      Array.isArray(suite.watchPattern) ? suite.watchPattern : [suite.watchPattern || '**/*'],
    );

    this.watcher = watch(watchPatterns, {
      cwd: this.config.projectRoot,
      ignored: this.config.excludePatterns,
      persistent: true,
      ignoreInitial: true,
    });

    this.watcher
      .on('add', (path) => this.queueChange(path, 'add'))
      .on('change', (path) => this.queueChange(path, 'change'))
      .on('unlink', (path) => this.queueChange(path, 'unlink'))
      .on('error', (error) => this.emit('error', error));

    console.log('File watcher started');
  }

  stop(): void {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
      console.log('File watcher stopped');
    }
  }

  private queueChange(path: string, type: FileChange['type']): void {
    this.changeQueue.push({
      path,
      type,
      timestamp: new Date(),
    });
    this.processChanges();
  }

  private handleChanges(): void {
    if (this.changeQueue.length === 0) return;

    const changes = [...this.changeQueue];
    this.changeQueue = [];

    this.emit('changes', changes);
  }
}