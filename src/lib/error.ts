import store from './store';
import * as path from 'path';
import * as fs from 'fs';
import errorHandler = require('../declare/errorHandler');

export default class ErrorHandler {
  private comicName: string;
  private outDir: string;
  private errorFilename: string = 'error.json';

  /**
   * @param { string | undefined } _comicName 漫画名
   * @param { errorHandler.options | undefined } _options 可选
   */
  constructor(_comicName?: string, _options?: errorHandler.options) {
    const options = _options || {};
    const { comicName, outDir } = store.get();
    this.comicName = _comicName || comicName;
    this.outDir = options.outDir || outDir;

    if (!this.comicName) {
      throw new Error('excepted comicName!');
    }
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
    let errorLog: object = {};
    const errorPath: string = this.getSavePath();
    if (fs.existsSync(errorPath)) {
      errorLog = require(errorPath);
    }
    return errorLog;
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
   * 保存指定类型的错误
   * @param { string } _type 错误的类型
   * @param { any } _data 待保存的错误信息
   */
  public setSpeError(_type: string, _data: any) {
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

  /**
   * 清楚错误文件内容
   * @param { string | undefined } _errorpath 错误文件路径
   */
  public clearErrors(_errorpath?: string) {
    const errorPath = _errorpath || this.getSavePath();
    if (fs.existsSync(errorPath)) {
      fs.writeFileSync(errorPath, '');
    }
  }
}

export const errorHandler = new ErrorHandler();
