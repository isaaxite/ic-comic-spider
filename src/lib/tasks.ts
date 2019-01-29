import * as fs from 'fs';
import * as path from 'path';
import * as ora from 'ora';
import * as sharp from 'sharp';
import * as cheerio from 'cheerio';
import axios from 'axios';

import * as helper from './helper';
import store from './store';
import merge from './merge';
import { CONFIG_TEMPLATE, UNIT_CHAPTER, UNIT_PICTURE } from '../config/constant';
import crop from './crop';
import Parser from './parser';

const self = {
  async _downloadChapter(comicName, chapterName, chapterUrl) {
    const { parser } = store.get();
    const count = await parser.comicCount(chapterUrl);
    const promiseList = [];
    for (let i = 0; i < count; i += 1) {
      const pageNo = i + 1;
      const imgSrcInfo = await parser.chapterPage(chapterUrl, pageNo, { chapterName });
      if (imgSrcInfo) {
        const { savePath } = helper.getSavePath(comicName, chapterName, imgSrcInfo.content);
        const imgStream = await parser.downloadPic(chapterName, imgSrcInfo);
        imgStream && imgStream.pipe(fs.createWriteStream(savePath));
      }
    }
  },

  async _handleDownloadErrors(comicName, downloadErrors) {
    // if (downloadErrors.length) {
    //   await Promise.resolve();
    //   for (const downloadError of downloadErrors) {
    //     const { chapter: chapterName, imgInfo } = downloadError;
    //     const { savePath } = helper.getSavePath(comicName, chapterName, imgInfo.content);
    //     const imgStream = await self._downloadPic(imgInfo);
    //     imgStream && imgStream.pipe(fs.createWriteStream(savePath));
    //   }
    // }
  },

  async _handleParseErrors(comicName, parsedErrors) {
    if (parsedErrors.length) {
      for (const parsedError of parsedErrors) {
        const { chapter, url } = parsedError;
        await this._downloadChapter(comicName, chapter, url);
      }
    }
  }
};

export default {
  async parseCatalog(url) {
    const { domain } = helper.parseCataLogUrl(url);
    const result = await axios.get(url).then((resp) => {
      const doc = cheerio.load(resp.data);
      const comicName = doc('.comic-name h1').text();
      const chapterEles = doc('.chapters li > a');
      const chapterList = helper.mapEles(chapterEles, (ele, index) => {
        return {
          title: ele.attr('title'),
          url: `${domain}/${ele.attr('href')}`
        };
      });
      chapterList.reverse();
      return Promise.resolve({
        comicName,
        chapterList
      });
    });
  
    return result;
  },
  
  async downloadComic(chapterList, comicName) {
    const imgSrcInfoList = [];
    for (let i = 0, len = chapterList.length; i < len; i += 1) {
      const { url: chapterUrl, title: chapterName } = chapterList[i];
      const { chapterDir } = helper.getSavePath(comicName, chapterName);
      const isExistChapter = fs.readdirSync(chapterDir).length;
  
      if (!isExistChapter) {
        await self._downloadChapter(comicName, chapterName, chapterUrl);
      }
    }
  },
  
  async run() {
    const { catalogs: catalogUrlList } = store.get();
    if (!catalogUrlList || !catalogUrlList.length) {
      helper.warn('please config the catalogs');
      process.exit();
    }
    for (const catalogUrl of catalogUrlList) {
      const parser = Parser.init(catalogUrl);
      store.set({ parser });
      const { enName } = helper.parseCataLogUrl(catalogUrl);
      const spin = ora(`[${enName}] download...`).start();
      const { chapterList, comicName } = await parser.catalog(catalogUrl);
      const realChapterList = helper.clipChapterList(chapterList);
      await this.downloadComic(realChapterList, comicName);
      await this.handleErrors(comicName);
      spin.succeed(`[${enName}] finish!`);
    }
  },
  
  async search() {
    let searchList: any[] = [];
    const { keyword } = store.get();
    const parserDirPath = path.join(__dirname, './parser');
    const parserNames = fs.readdirSync(parserDirPath).filter((item) => {
      return !['index.js'].includes(item);
    });
    for (const parserName of parserNames) {
      const parserPath = path.join(parserDirPath, parserName);
      const parser = require(parserPath).default;
      const list: any[] = await parser.search(keyword);
      searchList.push(...list);
    };
    const spin = ora(`search ${keyword}...`).start();
    
    spin.succeed([
      `search result: ${searchList.length || 'null'}`,
      ...searchList.map((item) => {
        return `${item.name}: ${item.src}`;
      })
    ].join('\n'));
  },
  
  merge() {
    const { volSize, comicName } = store.get();
    const { unit, num } = volSize;
    const spin = ora(`merging ${comicName}...`).start();
    switch (unit) {
      case UNIT_PICTURE:
        merge.baseOnPictureCount(num);
        break;
      case UNIT_CHAPTER:
        merge.baseOnChapterCount(num);
        break;
      default:
        helper.warn('wrong operation');
    }
    spin.succeed('finish');
  },
  
  config() {
    const { configPath, defaultConfigPath } = store.get();
    if (!configPath || !fs.existsSync(configPath)) {
      // init config file
      const configTemplate = JSON.stringify(CONFIG_TEMPLATE, null, 2);
      const filePath = configPath || defaultConfigPath;
      fs.writeFileSync(filePath, configTemplate);
      helper.succeed('init config file succeed!');
    } else {
      // read config file
      const fullPath = path.resolve(process.cwd(), configPath);
      const userConfig = helper.getConfig(fullPath);
      const config = {};
      Object.keys(userConfig).forEach((key) => {
        const item = userConfig[key];
        if (item) {
          config[key] = item;
        }
      });
      store.set(config);
      this.run();
    }
  },
  
  async crop() {
    let baseNum = 0;
    const { cropDir: chapterDirs, outDir, comicName, isSwap } = store.get();
    const spin = ora(`cropping...`).start();
    const saveDir = helper.getDirPath(outDir, `${comicName}_crop`);
    const comicPromise = chapterDirs.map((chapterDir) => {
      const chapterName = path.basename(chapterDir);
      const saveChapterDir = helper.getDirPath(saveDir, chapterName);
      const picNameInfos = helper.getDirContent(chapterDir);
      const ChapterPromsie = picNameInfos.map((picNameInfo) => {
        const format = picNameInfo.name.split('.').pop();
        const filePath = path.join(chapterDir, picNameInfo.name);
        const image = sharp(filePath);
        return image.metadata()
          .then((metadata) => {
            if (metadata.width > metadata.height) {
              const cropedPics = crop.init(filePath, { metadata, isSwap });
              const parseIndex = Number.parseInt(picNameInfo.name);
              const baseIndex = Number.isNaN(parseIndex) ? 1 : parseIndex;
              const promises = cropedPics.map((item, index) => {
                const pointNum = index + 1;
                const saveName = `${baseIndex}_${pointNum}.${format}`;
                const savePath = path.join(saveChapterDir, saveName);
                return item.toFile(savePath);
              });
              return Promise.all(promises);
            } else {
              const savePath = path.join(saveChapterDir, `${picNameInfo.name}.${format}`);
              const data = fs.readFileSync(filePath);
              fs.writeFileSync(savePath, data);
              return Promise.resolve();
            }
          });
      });
      return Promise.all(ChapterPromsie).then(() => {
        const picNames = helper.getFilteredDirContent(saveChapterDir);
        const getFileNameNum = (filename) => {
          let temp = filename.split('.')[0];
          temp = temp.replace('_', '.');
          return Number.parseFloat(temp);
        };
        picNames.sort((prev, next) => {
          return getFileNameNum(prev) - getFileNameNum(next);
        });
        picNames.forEach((picName, index) => {
          const format = picName.split('.').pop();
          const oldPath = path.join(saveChapterDir, picName);
          const newPath = path.join(saveChapterDir, `${index + 1}.${format}`);
          fs.renameSync(oldPath, newPath);
        });
        spin.info(`${chapterName} finish!`);
      });
    });
    Promise.all(comicPromise).then(() => {
      spin.succeed('finish!');
    });
  },
  
  async handleErrors(comicName) {
    const downloadErrors = helper.getDownloadErrors(comicName);
    const parsedErrors = helper.getParsedErrors(comicName);
    helper.clearErrors(comicName);
    await self._handleDownloadErrors(comicName, downloadErrors);
    await self._handleParseErrors(comicName, parsedErrors);
  }
};