const path = require('path');

const store = {
  saveDir: path.join(process.cwd(), './comic'),
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
