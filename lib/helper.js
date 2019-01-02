const fs = require('fs');
const path = require('path');
const store = require('./store');

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
  const defaultRoot = path.resolve(process.cwd(), './');
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

exports.filterDirContent = (list) => {
  return list.filter((item) => {
    return !item.startsWith('.') && !item.endsWith('.json');
  });
};

exports.sortDirContent = (_vols) => {
  const vols = exports.filterDirContent(_vols);
  const volInfoList = vols.map((vol) => {
    let numStr = '';
    const chars = vol.split('');
    chars.forEach((char) => {
      if (!Number.isNaN(+char)) {
        numStr += char;
      }
    });
    return {
      name: vol,
      index: numStr ? +numStr : -1,
    };
  });
  volInfoList.sort((prev, next) => {
    return prev.index - next.index;
  });
  return volInfoList;
};

exports.getDirContent = (dir) => {
  const content = fs.readdirSync(dir);
  const sortedContent = exports.sortDirContent(content);
  return sortedContent;
};

exports.mkDir = (...rest) => {
  const dir = path.join(...rest);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }
  return dir;
};

exports.getChapterIndex = (chapterList, title) => {
  let activeIndex = -1;
  for (let index = 0, len = chapterList.length; index < len; index += 1) {
    const chapter = chapterList[index];
    if (chapter.title.includes(title)) {
      activeIndex = index;
      break;
    }
  }
  return activeIndex;
};

exports.clipChapterList = (chapterList) => {
  const { startChapter, endChapter, options } = store.get();
  const startIndex = exports.getChapterIndex(chapterList, startChapter);
  const endIndex = exports.getChapterIndex(chapterList, endChapter);
  const realStartIndex = startIndex > 0 ? startIndex : 0;
  let realEndIndex = endIndex > 0 ? endIndex + 1 : chapterList.length;
  if (realEndIndex < realStartIndex) {
    realEndIndex = chapterList.length;
  }
  return chapterList.slice(realStartIndex, realEndIndex);
};

module.exports = exports;
