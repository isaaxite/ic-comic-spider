const gm = require('gm').subClass({imageMagick: true});
const helper = require('./helper');
const store = require('./store');
const fs = require('fs');
const path = require('path');

exports = {
  getSize(filePath) {
    return new Promise((resolve, reject) => {
      gm(filePath)
      .size((err, size) => {
        if (err) {
          return reject(err);
        }
        setTimeout(() => {
          return resolve(size);
        }, 3000);
      });
    });
  },

  crop(filePath, size, x) {
    return gm(filePath)
      .crop(size.width, size.height, x, 0)
      .stream();
  },

  async init(filePath) {
    const { isSwap } = store.get();
    const size = await exports.getSize(filePath);
    if (!size.width || !size.height) {
      return helper.warn(`Parse size fail: ${filePath}!`);
    }
    const isNeedCrop = size.width > size.height;
    if (!isNeedCrop) {
      return [fs.readFileSync(filePath)];
      return ;
    }
    size.width /= 2;
    const streams = [
      exports.crop(filePath, size, 0),
      exports.crop(filePath, size, size.width)
    ];
    isSwap && streams.reverse();
    return streams;
  }
};

module.exports = exports;
