const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const store = require('./store');
const helper = require('./helper');

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

  init(picPath, options = {}) {
    const { metadata, isSwap = false } = options;
    if (!metadata) {
      throw new Error('except picture metadata<{ width: number, height: number }>')
    }
    const exceptedWidth = Math.ceil(metadata.width / 2);
    const leftPosList = [0, metadata.width - exceptedWidth];
    
    const cropedPic = leftPosList.map((left) => {
      return sharp(picPath)
        .extract({
          left,
          top: 0,
          width: exceptedWidth,
          height: metadata.height
        });
    });
    isSwap && cropedPic.reverse();
    return cropedPic;
  }
};

module.exports = exports;
