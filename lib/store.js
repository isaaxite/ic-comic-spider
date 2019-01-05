const path = require('path');

const store = {
  defaultConfigPath: path.join(process.cwd(), './config.json'),
  outDir: process.cwd(),
  comicName: '',
  volNum: 200,
  options: {}
};

module.exports = {
  get(key) {
    if (key) {
      return store[key];
    } else {
      return store;
    }
  },

  set(...rest) {
    if (rest.length === 1) {
      const [data] = rest;
      Object.assign(store, data);
    } else {
      const [key, value] = rest;
      store[key] = value;
    }
  }
};
