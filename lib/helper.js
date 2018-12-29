const fs = require('fs');
const path = require('path');

exports.mapEles = (eles, callback) => {
  const arr = [];
  for (let i = 0, len = eles.length; i < len; i += 1) {
    const ele = eles.eq(i);
    if (callback) {
      const res = callback(ele, i);
      arr.push(res);
    }
  }
  return arr;
}

exports.getSavePath = (_comicName, _chapterDir, _filename) => {
  let comicDir = null;
  let chapterDir = null;
  let savePath = null;
  const defaultRoot = path.resolve(__dirname, '../');
  const saveDir = path.join(defaultRoot, './comic');
  if (!fs.existsSync(saveDir)) {
    fs.mkdirSync(saveDir);
  }
  if (_comicName) {
    comicDir = path.join(saveDir, `/${_comicName}`);
    if (!fs.existsSync(comicDir)) {
      fs.mkdirSync(comicDir);
    }
  }

  if (_chapterDir) {
    chapterDir = path.join(comicDir, `/${_chapterDir}`);
    savePath = path.join(chapterDir, `/${_filename}`);
    if (!fs.existsSync(chapterDir)) {
      fs.mkdirSync(chapterDir);
    }
  }
  
  return { saveDir, comicDir, chapterDir, savePath };
};

exports.parseCataLogUrl = (url) => {
  const regExp = /.*com/g;
  const domain = url.match(regExp)[0];
  const enName = url.split('/').pop();
  return { domain, enName };
};

exports.getErrorSavedPath = (comicName) => {
  const { comicDir } =  exports.getSavePath(comicName);
  return path.join(comicDir, '/error.json');
};

exports.getErrorInfo = (comicName) => {
  let errorLog;
  const savedPath = exports.getErrorSavedPath(comicName);
  try {
    errorLog = require(savedPath);
  } catch (error) {
    errorLog = {};
  }
  return errorLog;
};

exports.setSpeError = (comicName, type, data) => {
  const savedPath = exports.getErrorSavedPath(comicName);
  const errorInfo = exports.getErrorInfo(comicName);
  let downloadErrors = errorInfo[type];

  if (!downloadErrors) {
    downloadErrors = [];
    errorInfo[type] = downloadErrors;
  }

  downloadErrors.push(data);
  fs.writeFileSync(savedPath, JSON.stringify(errorInfo, null, 2));
};

exports.getSpeError = (comicName, type, data) => {
  const errorInfo = exports.getErrorInfo(comicName);
  const speErrors = errorInfo[type] || [];
  return speErrors;
};

exports.getDownloadErrors = (comicName) => {
  const type = 'download';
  return exports.getSpeError(comicName, type);
};

exports.setDownloadError = (comicName, data) => {
  const type = 'download';
  exports.setSpeError(comicName, type, data);
};

exports.getParsedErrors = (comicName) => {
  const type = 'parse';
  return exports.getSpeError(comicName, type);
};

exports.setParseError = (comicName, chapterName, pageUrl) => {
  const type = 'parse';
  exports.setSpeError(comicName, type, {
    chapter: chapterName,
    url: pageUrl
  });
};

exports.clearErrors = (comicName) => {
  const savedPath = exports.getErrorSavedPath(comicName);
  if (fs.existsSync(savedPath)) {
    fs.writeFileSync(savedPath, '');
  }
};

module.exports = exports;
