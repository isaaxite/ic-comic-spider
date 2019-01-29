import store from './lib/store';
import tasks from './lib/tasks';
import { CROP, CONFIG, SEARCH, MERGE } from './config/constant';

export const init = (options, config) => {
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
