import * as fs from 'fs';
import * as path from 'path';
import * as ora from 'ora';
import * as sharp from 'sharp';
import store from './store';
import { TEMP_DIR } from '../config/constant';

export const getConfig = (_filePath) => {
  const filePath = !_filePath
    ? path.join(process.cwd(), './config.json')
    :  _filePath;
  if (!fs.existsSync(filePath)) {
    return {};
  }
  const config = require(filePath);
  return config;
};

export const warn = (text = '') => {
  ora(text).warn();
};

export const succeed = (text = '') => {
  ora(text).succeed();
};

export const mapEles = (eles: any, callback: Function) => {
  const arr: any = [];
  for (let i = 0, len = eles.length; i < len; i += 1) {
    const ele = eles.eq(i);
    if (callback) {
      const res = callback(ele, i);
      arr.push(res);
    }
  }
  return arr;
}

export const getSavePath = (_comicName: string, _chapterDir?: string, _filename?: string) => {
  let comicDir: string = '';
  let chapterDir: string = '';
  let savePath: string = '';
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

export const parseCataLogUrl = (url: string = '') => {
  const regExp = /.*com/g;
  const domain = (url.match(regExp) || [])[0];
  const enName = url.split('/').pop();
  return { domain, enName };
};

export const getErrorSavedPath = (comicName: string) => {
  const { comicDir } = getSavePath(comicName);
  return path.join(comicDir, '/error.json');
};

export const getErrorInfo = (comicName: string) => {
  let errorLog: object;
  const savedPath = getErrorSavedPath(comicName);
  try {
    errorLog = require(savedPath);
  } catch (error) {
    errorLog = {};
  }
  return errorLog;
};

export const setSpeError = (comicName: string, type: string, data: any) => {
  const savedPath = getErrorSavedPath(comicName);
  const errorInfo = getErrorInfo(comicName);
  let downloadErrors = errorInfo[type];

  if (!downloadErrors) {
    downloadErrors = [];
    errorInfo[type] = downloadErrors;
  }

  downloadErrors.push(data);
  fs.writeFileSync(savedPath, JSON.stringify(errorInfo, null, 2));
};

export const getSpeError = (comicName: string, type: string, data?: any) => {
  const errorInfo = getErrorInfo(comicName);
  const speErrors = errorInfo[type] || [];
  return speErrors;
};

export const getDownloadErrors = (comicName: string) => {
  const type = 'download';
  return getSpeError(comicName, type);
};

export const setDownloadError = (data: any) => {
  const { comicName } = store.get();
  const type = 'download';
  setSpeError(comicName, type, data);
};

export const getParsedErrors = (comicName: string) => {
  const type = 'parse';
  return getSpeError(comicName, type);
};

export const setParseError = (chapterName: string, pageUrl: string) => {
  const type = 'parse';
  const { comicName } = store.get();
  setSpeError(comicName, type, {
    chapter: chapterName,
    url: pageUrl
  });
};

export const clearErrors = (comicName: string) => {
  const savedPath = getErrorSavedPath(comicName);
  if (fs.existsSync(savedPath)) {
    fs.writeFileSync(savedPath, '');
  }
};

export const filterDirContent = (list: string[]) => {
  return list.filter((item) => {
    return !item.startsWith('.')
      && !item.endsWith('.json')
      && !item.endsWith('.log')
      && !item.endsWith(TEMP_DIR);
  });
};

export const getFilteredDirContent = (dir) => {
  const dirContent = fs.readdirSync(dir);
  return filterDirContent(dirContent);
};

export const sortDirContent = (_vols) => {
  const vols = filterDirContent(_vols);
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

export const typingChapter = (_vols: string[]) => {
  const vols = filterDirContent(_vols);
  const keywords = ['番外', '卷', '话'];
  const typingChapter: Array<any> = new Array(keywords.length).map(() => {
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

export const sortChapter = (typingChapter: Array<any[]>) => {
  let baseIndex = 0;
  const volInfoList: any[] = [];
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

export const getComicDirContent = (dir: string) => {
  const dirContent = fs.readdirSync(dir);
  let data = typingChapter(dirContent);
  data = sortChapter(data);
  return data;
};

export const getDirContent = (dir) => {
  const content = fs.readdirSync(dir);
  const sortedContent = sortDirContent(content);
  return sortedContent;
};

export const getDirPath = (_base, ...rest) => {
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

export const getPicMetadata = (picPath, callback) => {
  sharp(picPath).metadata()
    .then((metadata) => {
      callback(null, metadata);
    })
    .catch((err) => {
      callback(err);
    });
};

export const mkDir = (...rest) => {
  const dir = path.join(...rest);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }
  return dir;
};

export const getChapterIndex = (chapterList, title) => {
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

export const clipChapterList = (chapterList) => {
  const { startChapter, endChapter, options } = store.get();
  const startIndex = getChapterIndex(chapterList, startChapter);
  const endIndex = getChapterIndex(chapterList, endChapter);
  const realStartIndex = startIndex > 0 ? startIndex : 0;
  let realEndIndex = endIndex > 0 ? endIndex + 1 : chapterList.length;
  if (realEndIndex < realStartIndex) {
    realEndIndex = chapterList.length;
  }
  return chapterList.slice(realStartIndex, realEndIndex);
};

export const parseUrl = (_url) => {
  const parts = _url.split(path.sep);
  const content = parts.pop();
  const prefix = _url.slice(0, _url.length - content.length);
  const [ name, format ] = content.split('.');
  const index = Number.parseInt(name);
  return { url: _url, prefix, content, name, format, index };
};
