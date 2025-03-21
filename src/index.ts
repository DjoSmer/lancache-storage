require('dotenv').config()

import { App } from './app';

declare global {
  var app: App;
}

const storageDir = process.env?.APP_STORAGE_DIR
const mode = process.env?.APP_MODE || 'proxy';

if (!storageDir) throw new Error('STORAGE_DIR is empty');

const config = {
  storageDir,
  mode
}

global.app = new App(config);
global.app.run();
