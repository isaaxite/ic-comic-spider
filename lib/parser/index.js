const url = require('url');
const store = require('../store');
const HOST_NAME = {
  verydm: 'www.verydm.com'
};
const parserMap = {
  [HOST_NAME.verydm]: './verydm'
};

exports.init = (catalog) => {
  const { hostname } = url.parse(catalog);
  switch(hostname) {
    case HOST_NAME.verydm:
      return require(parserMap[HOST_NAME.verydm]);
  }
};
