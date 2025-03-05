require('dotenv').config()

import { App } from './app';

declare global {
  var app: App;
}

const storageDir = process.env.STORAGE_DIR 

if (!storageDir) throw new Error('STORAGE_DIR is empty');

const config = {
  storageDir,
}

global.app = new App(config);
global.app.run();
