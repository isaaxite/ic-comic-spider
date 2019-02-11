import * as url from 'url';
import axios from 'axios';
import * as cheerio from 'cheerio';
import * as helper from '../../helper';
import { ERROR_TYPES, TIME_OUT } from '../../../config/constant';
import ErrorHandler from '../../error';
import parserDto = require('../../../declare/parser');
import store from '../../store';
import Spinner from '../../spinner';

export default class Verydm implements parserDto.BaseParser {
  constructor() {}

  /**
   * 解析漫画目录
   * @param { string } _url 漫画目录的链接
   */
  public async catalog(_url: string) {
    const { protocol, hostname } = url.parse(_url);
    const origin = `${protocol}//${hostname}`;
    const promise = axios.get(_url)
      .then((resp) => {
        const doc = cheerio.load(resp.data);
        const comicName = doc('.comic-name h1').text();
        const chapterEles = doc('.chapters li > a');
        const chapterList = helper.mapEles(chapterEles, (_ele: any, _index: number) => {
          return {
            title: _ele.attr('title'),
            url: url.resolve(origin, _ele.attr('href'))
          };
        });
        chapterList.reverse();
        const result: parserDto.CatalogParseResult = {
          comicName,
          chapterList
        };
        return Promise.resolve(result);
      });

    return promise;
  }

  /**
   * 解析章节某一页漫画的图片信息
   * @param { string } _url 章节中的某一页漫画的page url
   * @param { any } _options 可选
   */
  public async chapterPage(_url: string, _options: any) {
    const { protocol, hostname } = url.parse(_url);
    const origin = `${protocol}//${hostname}`;
    const CancelToken = axios.CancelToken;
    const source = CancelToken.source();
    const reqOptions = {
      method: 'GET',
      url: _url,
      timeout: TIME_OUT,
      cancelToken: source.token
    };
    const setError = () => {
      const errorHandler = ErrorHandler.getIns();
      errorHandler.setParsedError({
        chapter: _options.chapterName,
        url: _url
      });
    };
    // 无响应处理
    const noRespHandler = setTimeout(() => {
      source.cancel();
      Spinner.invoke('warn', `no response: ${_url}`);
      setError();
    }, TIME_OUT + 2 * 1000);
    const promise: Promise<parserDto.ImgInfo | undefined> = axios.request(reqOptions).then((resp) => {
      const doc = cheerio.load(resp.data);
      const nextPage = resp.data.match(/<a href="(.*)">下一页(?:<\/a>)?/)[1];
      const isLast = nextPage.includes('已经是最后一页了');
      const imgSrc = doc('#mainImage2').attr('src');
      const parsedUrl = helper.parseUrl(imgSrc);
      const imgInfo: parserDto.ImgInfo = {
        isLast,
        referer: _url,
        next: url.resolve(origin, nextPage),
        ...parsedUrl
      };
      return Promise.resolve(imgInfo);
    }).catch(async (error) => {
      const errMsg = error.message || '';
      const isTimeout = errMsg.includes('timeout');

      if (axios.isCancel(error)) {
        return ;
      }

      if (isTimeout) {
        // Spinner.invoke('info', `parse overtime reconnection: [${_options.chapterName}]${_url}`);
        return this.chapterPage(_url, _options);
      } else {
        Spinner.invoke('warn', `parse fail: [${_options.chapterName}]${_url}`);
        setError();
      }
    }).finally(() => {
      clearTimeout(noRespHandler);
    });

    return promise;
  }

  /**
   * 下载漫画图片
   * @param _chapterName 章节名
   * @param _imgInfo 待下载的图片信息
   */
  public async downloadPic(_chapterName: string, _imgInfo: parserDto.ImgInfo) {
    const options = {
      method: 'GET',
      responseType:'stream',
      headers: { 'Referer': _imgInfo.referer },
      url: _imgInfo.url,
      timeout: TIME_OUT,
    };
    const setError = (chapter: string, imgInfo: parserDto.ImgInfo) => {
      const errorHandler = ErrorHandler.getIns();
      errorHandler.setDownloadError({
        chapter,
        imgInfo
      });
    };
    const promise: Promise<any> = axios(options)
      .then((resp) => {
        const isValid = resp.statusText === 'OK';
        if (isValid) {
          return Promise.resolve(resp.data);
        } else {
          Spinner.invoke('warn', `download fail: ${_imgInfo.url}`);
          setError(_chapterName, _imgInfo);
        }
      })
      .catch(async (error) => {
        const errMsg = error.message || '';
        const isTimeout = errMsg.includes('timeout');

        if (axios.isCancel(error)) {
          return ;
        } 

        if (isTimeout) {
          // Spinner.invoke('info', `download overtime reconnection: ${_imgInfo.url}`);
          return this.downloadPic(_chapterName, _imgInfo);
        } else {
          Spinner.invoke('warn', `download fail: ${_imgInfo.url}`);
          setError(_chapterName, _imgInfo);
        }
      });

    return promise;
  }

  /**
   * 搜索漫画
   * @param { string } _keyword
   */
  public async search(_keyword: string) {
    const searchUrl = `http://www.verydm.com/index.php?r=comic%2Fsearch&keyword=${encodeURIComponent(_keyword)}`;
    const promise = axios.get(searchUrl)
      .then((resp) => {
        const doc = cheerio.load(resp.data);
        const eles = doc('.main-container .list li');
        const searchList: parserDto.SearchListItem = helper.mapEles(eles, (_ele: any, _index: number) => {
          const itemEle = cheerio.load(`<li>${_ele}</li>`);
          const name = itemEle('p > a').text();
          const src = itemEle('li > a').attr('href');
          return { name, src };
        }).filter((item: any) => {
          return item.name;
        });
        return searchList;
      });

    return promise;
  }
}
