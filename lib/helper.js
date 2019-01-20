const fs = require('fs');
const ora = require('ora');
const path = require('path');
const sharp = require('sharp');
const store = require('./store');
const { TEMP_DIR } = require('../config/constant');

exports.getConfig = (_filePath) => {
  const filePath = !_filePath
    ? path.join(process.cwd(), './config.json')
    :  _filePath;
  if (!fs.existsSync(filePath)) {
    return {};
  }
  const config = require(filePath);
  return config;
};

exports.warn = (text = '') => {
  ora(text).warn();
};

exports.succeed = (text = '') => {
  ora(text).succeed();
};

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
  const { outDir } = store.get();
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir);
  }
  if (_comicName) {
    comicDir = path.join(outDir, `/${_comicName}`);
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
  
  return { outDir, comicDir, chapterDir, savePath };
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

exports.setDownloadError = (data) => {
  const { comicName } = store.get();
  const type = 'download';
  exports.setSpeError(comicName, type, data);
};

exports.getParsedErrors = (comicName) => {
  const type = 'parse';
  return exports.getSpeError(comicName, type);
};

exports.setParseError = (chapterName, pageUrl) => {
  const type = 'parse';
  const { comicName } = store.get();
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
    return !item.startsWith('.')
      && !item.endsWith('.json')
      && !item.endsWith('.log')
      && !item.endsWith(TEMP_DIR);
  });
};

exports.getFilteredDirContent = (dir) => {
  const dirContent = fs.readdirSync(dir);
  return exports.filterDirContent(dirContent);
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

exports.typingChapter = (_vols) => {
  const vols = exports.filterDirContent(_vols);
  const keywords = ['番外', '卷', '话'];
  const typingChapter = new Array(keywords.length).map(() => {
    return [];
  });
  vols.forEach((vol) => {
    keywords.forEach((keyword, index) => {
      if (vol.includes(keyword)) {
        if (!typingChapter[index]) {
          typingChapter[index] = [];
        }
        typingChapter[index].push(vol);
      }
    });
  });
  return typingChapter;
};

exports.sortChapter = (typingChapter) => {
  let baseIndex = 0;
  const volInfoList = [];
  typingChapter.forEach((vols) => {
    const temp = vols.map((vol) => {
      let numStr = '';
      let index = baseIndex;
      const chars = vol.split('');
      chars.forEach((char) => {
        if (!Number.isNaN(+char)) {
          numStr += char;
        }
      });
      index += +numStr;
      return {
        name: vol,
        index
      };
    });
    baseIndex += temp.length;
    volInfoList.push(...temp);
  });
  volInfoList.sort((prev, next) => {
    return prev.index - next.index;
  });
  return volInfoList;
};

exports.getComicDirContent = (dir) => {
  let data = fs.readdirSync(dir);
  data = exports.typingChapter(data);
  data = exports.sortChapter(data);
  return data;
};

exports.getDirContent = (dir) => {
  const content = fs.readdirSync(dir);
  const sortedContent = exports.sortDirContent(content);
  return sortedContent;
};

exports.getDirPath = (_base, ...rest) => {
  let base = path.isAbsolute(_base) ? _base : path.resolve(_base);
  if (!fs.existsSync(base)) {
    throw new Error(`no such base dir: ${base}`);
  }
  rest.forEach((item) => {
    const dir = path.join(base, item);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir);
    }
  });
  return path.join(base, ...rest);
}

exports.getPicMetadata = (picPath, callback) => {
  sharp(picPath).metadata()
    .then((metadata) => {
      callback(null, metadata);
    })
    .catch((err) => {
      callback(err);
    });
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

exports.parseUrl = (_url) => {
  const parts = _url.split(path.sep);
  const content = parts.pop();
  const prefix = _url.slice(0, _url.length - content.length);
  const [ name, format ] = content.split('.');
  const index = Number.parseInt(name);
  return { url: _url, prefix, content, name, format, index };
};

module.exports = exports;
