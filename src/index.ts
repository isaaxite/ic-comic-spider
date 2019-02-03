import store from './lib/store';
import Tasks from './lib/tasks';
import { CROP, CONFIG, SEARCH, MERGE } from './config/constant';
import icsdr = require('./declare/icsdr');

export const init = (options: icsdr.Options, config: icsdr.Config) => {
  const tasks = new Tasks();
  store.set({ options, ...config });
  switch (options.mode) {
    case CROP:
      tasks.crop();
      break;
    
    case CONFIG:
      tasks.config();
      break;
    
    case SEARCH:
      tasks.search();
      break;

    case MERGE:
      tasks.merge();
      break;

    default:
      tasks.run();
  }
};
