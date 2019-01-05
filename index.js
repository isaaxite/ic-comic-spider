const store = require('./lib/store');
const tasks = require('./lib/tasks');
const { CONFIG, SEARCH, MERGE } = require('./config/constant');

exports.init = (options, config) => {
  store.set({ options, ...config });
  switch (options.mode) {
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
