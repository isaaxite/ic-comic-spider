import ErrorHandler from "./lib/error";
import * as path from 'path';
import { ERROR_TYPES } from './config/constant';

const errorHandler = new ErrorHandler('tempComic', { outDir: path.join(process.cwd(), '../comic') });

(async () => {
  // errorHandler.clearErrors();
  // new Array(3).fill(1).forEach((item: any, index: number) => {
  //   errorHandler.setDownloadError({
  //     chapter: '第538话',
  //     imgInfo: {
  //       url: `http://imgn1.magentozh.com:8090//h/huoyingrenzhe/ch_538/00${index + 1}.png`,
  //       prefix: 'http://isaac.webite/chapter/',
  //       name: `${index + 1}`,
  //       content: `${index + 1}`,
  //       format: 'png',
  //       index: index + 1,
  //       referer: `http://www.verydm.com/chapter.php?id=18988&p=${index + 1}`
  //     }
  //   });
  // });

  // errorHandler.setParsedError({
  //   chapter: '第538话',
  //   url: 'http://www.verydm.com/chapter.php?id=18988&p=4'
  // });
  const temp = await errorHandler.handleErrors();
  console.log(temp);
})();
