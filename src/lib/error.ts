import store from './store';
import * as path from 'path';
import * as fs from 'fs';
import { ERROR_TYPES } from '../config/constant';
import Parser from './parser/index';
import errorHandler = require('../declare/errorHandler');
import parserDto = require('../declare/parser');
import tasks from './tasks';
import Tasks from './tasks';
import Spinner from './spinner';

export default class ErrorHandler {
  static instance: ErrorHandler;
  private comicName: string;
  private outDir: string;
  private errorFilename: string = 'error.json';
  private parserPool: { [key: string]: Parser } = {};

  /**
   * @param { string | undefined } _comicName 漫画名
   * @param { errorHandler.options | undefined } _options 可选
   */
  constructor(_comicName?: string, _options?: errorHandler.Options) {
    const options = _options || {};
    const { comicName, outDir } = store.get();
    this.comicName = _comicName || comicName;
    this.outDir = options.outDir || outDir;

    if (!this.comicName) {
      throw new Error('excepted comicName!');
    }
  }

  /**
   * 单利模式获取实例
   * @param { string | undefined } _comicName 漫画名
   * @param { errorHandler.Options | undefined } _options 可选
   */
  static getIns(_comicName?: string, _options?: errorHandler.Options) {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler(_comicName, _options);
    }
    return ErrorHandler.instance;
  }

  /**
   * 获取error.json的保存路径
   */
  public getSavePath() {
    const { comicName, outDir } = this;
    const saveDir = path.join(outDir, this.comicName);
    const savePath = path.join(saveDir, this.errorFilename);
    if (!comicName) {
      throw new Error('comicName is not exist!');
    }
    if (!fs.existsSync(saveDir)) {
      throw new Error('dir is not exist!');
    }
    return savePath;
  }

  /**
   * 获取当前下载漫画的错误文件
   */
  public getErrorInfo() {
    let errorLog: errorHandler.ErrorInfo = {};
    const { outDir } = store.get();
    const relativedPath: string = this.getSavePath();
    const errorPath = path.resolve(relativedPath);
    if (fs.existsSync(errorPath)) {
      try {
        errorLog = require(errorPath) || {};
      } catch (error) {
        errorLog = {};
      }
    }
    return errorLog as errorHandler.ErrorInfo;
  }

  /**
   * 获取指定类型的错误信息
   * @param { string } _type 错误的类型
   */
  public getSpeError(_type: string) {
    const errorInfo: any = this.getErrorInfo();
    const speErrors: any[] = errorInfo[_type] || [];
    return speErrors;
  }

  /**
   * 写入下载错误信息
   * @param { errorHandler.Download }  _data
   */
  public setDownloadError(_data: errorHandler.Download) {
    this.setSpeError(ERROR_TYPES.download, _data);
  }

  /**
   * 写入解析错误
   * @param { errorHandler.Parse } _data
   */
  public setParsedError(_data: errorHandler.Parse) {
    this.setSpeError(ERROR_TYPES.parse, _data);
  }

  /**
   * 清楚错误文件内容
   * @param { string | undefined } _errorpath 错误文件路径
   */
  public clearErrors(_errorpath?: string) {
    const errorPath = _errorpath || this.getSavePath();
    if (fs.existsSync(errorPath)) {
      fs.writeFileSync(errorPath, '{}');
    }
  }

  /**
   * 处理下载和解析的错误
   */
  public async handleErrors() {
    const { comicName, outDir } = this;
    const errorInfo = this.getErrorInfo();
    const downloadErrors: errorHandler.Download[] = errorInfo[ERROR_TYPES.download];
    const parsedErrors: errorHandler.Parse[] = errorInfo[ERROR_TYPES.parse];
    const comicDir: string = path.join(outDir, comicName);

    if (!downloadErrors && !parsedErrors) {
      return ;
    }
    const spinner = Spinner.getIns();
    spinner.info('start handle errors');
    this.clearErrors();

    if (downloadErrors) {
      const errorHandler = ErrorHandler.getIns();
      const savedPath: string = this.getSavePath();
      fs.writeFileSync(savedPath, JSON.stringify({
        [ERROR_TYPES.download]: downloadErrors
      }, null, 2));
      /* 暂不处理 download error（因暂无法区分坏资源与可避免的下载错误） */
      // for (const error of downloadErrors) {
      //   const { chapter, imgInfo } = error;
      //   const savePath = path.join(comicDir, chapter, `${imgInfo.index}.${imgInfo.format}`);
      //   const parser = this.getParserIns(imgInfo.url);
      //   const imgStream = await parser.downloadPic(chapter, imgInfo);
      //   imgStream && imgStream.pipe(fs.createWriteStream(savePath));
      // }
    }

    if (parsedErrors) {
      const tasks = new Tasks();
      const parser = store.get('parser');
      if (!parser) {
        const newParser = new Parser(parsedErrors[0].url);
        store.set({ parser: newParser });
      }
      for (const error of parsedErrors) {
        const { chapter, url } = error;
        await tasks.downloadChapter(comicName, chapter, url, {
          handleError: true
        });
      }
    }
  }

  /**
   * 从缓存的parser实例池中获取实例。有则取，无则存
   * @param { string } _key
   */
  private getParserIns(_key: string) {
    let parser: Parser;
    const { parserPool } = this;
    const isExistIns = Object.keys(parserPool).includes(_key);
    if (isExistIns) {
      parser = parserPool[_key];
    } else {
      parser = new Parser(_key);
      parserPool[_key] = parser;
    }
    return parser;
  }

  /**
   * 保存指定类型的错误
   * @param { string } _type 错误的类型
   * @param { errorHandler.Download | errorHandler.Parse } _data 待保存的错误信息
   */
  private setSpeError(_type: string, _data: errorHandler.Download | errorHandler.Parse) {
    const savedPath: string = this.getSavePath();
    const errorInfo: any = this.getErrorInfo();

    let speError = errorInfo[_type];
    if (!speError) {
      speError = [];
      errorInfo[_type] = speError;
    }
    speError.push(_data);
    fs.writeFileSync(savedPath, JSON.stringify(errorInfo, null, 2));
  }
}
