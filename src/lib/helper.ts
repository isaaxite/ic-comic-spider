import * as fs from 'fs';
import * as path from 'path';
import * as ora from 'ora';
import * as sharp from 'sharp';
import store from './store';
import { TEMP_DIR } from '../config/constant';
import icsdr = require('../declare/icsdr');

export const getConfig = (_filePath: string) => {
  const filePath = !_filePath
    ? path.join(process.cwd(), './config.json')
    :  _filePath;
  if (!fs.existsSync(filePath)) {
    return new icsdr.Config();
  }
  const config: icsdr.Config = require(filePath);
  return config;
};

export const warn = (text: string = '') => {
  ora(text).warn();
};

export const succeed = (text: string = '') => {
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

export const filterDirContent = (list: string[]) => {
  return list.filter((item) => {
    return !item.startsWith('.')
      && !item.endsWith('.json')
      && !item.endsWith('.log')
      && !item.endsWith(TEMP_DIR);
  });
};

export const getFilteredDirContent = (dir: string) => {
  const dirContent = fs.readdirSync(dir);
  return filterDirContent(dirContent);
};

export const sortDirContent = (_vols: string[]) => {
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
      const chars: string[] = vol.split('');
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

export const getDirContent = (_dir: string) => {
  const content = fs.readdirSync(_dir);
  const sortedContent = sortDirContent(content);
  return sortedContent;
};

export const getDirPath = (_base: string, ..._rest: string[]) => {
  let base = path.isAbsolute(_base) ? _base : path.resolve(_base);
  if (!fs.existsSync(base)) {
    throw new Error(`no such base dir: ${base}`);
  }
  _rest.forEach((item) => {
    const dir = path.join(base, item);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir);
    }
  });
  return path.join(base, ..._rest);
}

export const getPicMetadata = (_picPath: string, _cb: (err: Error | null, metadata?: sharp.Metadata) => void) => {
  sharp(_picPath).metadata()
    .then((metadata) => {
      _cb(null, metadata);
    })
    .catch((err) => {
      _cb(err);
    });
};

export const mkDir = (..._rest: string[]) => {
  const dir = path.join(..._rest);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }
  return dir;
};

export const getChapterIndex = (_chapterList: any[], _title: string) => {
  let activeIndex = -1;
  for (let index = 0, len = _chapterList.length; index < len; index += 1) {
    const chapter = _chapterList[index];
    if (chapter.title.includes(_title)) {
      activeIndex = index;
      break;
    }
  }
  return activeIndex;
};

export const clipChapterList = (_chapterList: any[]) => {
  const { startChapter, endChapter, options } = store.get();
  const startIndex = getChapterIndex(_chapterList, startChapter);
  const endIndex = getChapterIndex(_chapterList, endChapter);
  const realStartIndex = startIndex > 0 ? startIndex : 0;
  let realEndIndex = endIndex > 0 ? endIndex + 1 : _chapterList.length;
  if (realEndIndex < realStartIndex) {
    realEndIndex = _chapterList.length;
  }
  return _chapterList.slice(realStartIndex, realEndIndex);
};

export const parseUrl = (_url: string) => {
  const parts = _url.split(path.sep);
  const content = parts.pop() || '';
  const prefix = _url.slice(0, _url.length - content.length);
  const [ name, format ] = content.split('.');
  const index = Number.parseInt(name);
  return { url: _url, prefix, content, name, format, index };
};
