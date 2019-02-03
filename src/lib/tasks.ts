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
import Parser from './parser/index';
import icsdr = require('../declare/icsdr');
import ErrorHandler from './error';

export default class Tasks {
  constructor() {

  }
  
  public async downloadChapter(_comicName: string, _chapterName: string, _chapterUrl: string) {
    const { parser } = store.get();
    const count = await parser.comicCount(_chapterUrl);
    const promiseList = [];
    for (let i = 0; i < count; i += 1) {
      const pageNo = i + 1;
      const imgSrcInfo = await parser.chapterPage(_chapterUrl, pageNo, { chapterName: _chapterName });
      if (imgSrcInfo) {
        const { savePath } = helper.getSavePath(_comicName, _chapterName, imgSrcInfo.content);
        const imgStream = await parser.downloadPic(_chapterName, imgSrcInfo);
        imgStream && imgStream.pipe(fs.createWriteStream(savePath));
      }
    }
  }
  
  public async downloadComic(_chapterList: any[], _comicName: string) {
    const imgSrcInfoList = [];
    for (let i = 0, len = _chapterList.length; i < len; i += 1) {
      const { url: chapterUrl, title: chapterName } = _chapterList[i];
      const { chapterDir } = helper.getSavePath(_comicName, chapterName);
      const isExistChapter = fs.readdirSync(chapterDir).length;
  
      if (!isExistChapter) {
        await this.downloadChapter(_comicName, chapterName, chapterUrl);
      }
    }
  }
  
  public async run() {
    const { catalogs: catalogUrlList } = store.get();
    if (!catalogUrlList || !catalogUrlList.length) {
      helper.warn('please config the catalogs');
      process.exit();
    }
    for (const catalogUrl of catalogUrlList) {
      const parser = new Parser(catalogUrl);
      store.set({ parser });
      const { enName } = helper.parseCataLogUrl(catalogUrl);
      const spin = ora(`[${enName}] download...`).start();
      const { chapterList, comicName } = await parser.catalog(catalogUrl);
      const realChapterList = helper.clipChapterList(chapterList);
      await this.downloadComic(realChapterList, comicName);
      const errorHandler = ErrorHandler.getIns();
      errorHandler.handleErrors();
      spin.succeed(`[${enName}] finish!`);
    }
  }
  
  public async search() {
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
  }
  
  public merge() {
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
  }
  
  public config() {
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
      const userConfig: any = helper.getConfig(fullPath);
      const config: any = {};
      Object.keys(userConfig).forEach((key) => {
        const item = userConfig[key];
        if (item) {
          config[key] = item;
        }
      });
      store.set(config as icsdr.Config);
      this.run();
    }
  }
  
  public async crop() {
    const { cropDir: chapterDirs, outDir, comicName, isSwap } = store.get();
    const spin = ora(`cropping...`).start();
    const saveDir = helper.getDirPath(outDir, `${comicName}_crop`);
    const comicPromise = chapterDirs.map((chapterDir: string) => {
      const chapterName = path.basename(chapterDir);
      const saveChapterDir = helper.getDirPath(saveDir, chapterName);
      const picNameInfos = helper.getDirContent(chapterDir);
      const ChapterPromsie = picNameInfos.map((picNameInfo) => {
        const format = picNameInfo.name.split('.').pop();
        const filePath = path.join(chapterDir, picNameInfo.name);
        const image = sharp(filePath);
        return image.metadata()
          .then((metadata: sharp.Metadata) => {
            if (metadata.width && metadata.height) {
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
                Promise.all(promises);
              } else {
                const savePath = path.join(saveChapterDir, `${picNameInfo.name}.${format}`);
                const data = fs.readFileSync(filePath);
                fs.writeFileSync(savePath, data);
                Promise.resolve();
              }
            } else {
              Promise.reject();
            }
          });
      });
      return Promise.all(ChapterPromsie).then(() => {
        const picNames = helper.getFilteredDirContent(saveChapterDir);
        const getFileNameNum = (filename: string) => {
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
  }
}
