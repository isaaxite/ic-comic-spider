import { ERROR_TYPES } from '../config/constant';
import parserDto = require('./parser');

export = errorHandler;

declare namespace errorHandler {
  interface Options {
    outDir?: string;
  }

  interface Download {
    chapter: string;

    imgInfo: parserDto.ImgInfo;

    [key: string]: any;
  }

  interface Parse {
    chapter: string;

    url: string;

    [key: string]: any;
  }

  interface ErrorInfo {
    [ERROR_TYPES.download]?: Download[];

    [ERROR_TYPES.parse]?: Parse[];

    [key: string]: any;
  }

  // class ErrorInfo implements ErrorInfo {
  //   constructor() {}
  // }
}
