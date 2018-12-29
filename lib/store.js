const store = {

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
