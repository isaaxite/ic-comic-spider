import * as url from 'url';
import * as path from 'path';
import axios from 'axios';
import * as cheerio from 'cheerio';
import * as helper from '../../helper';
import { ERROR_TYPES, TIME_OUT } from '../../../config/constant';
import ErrorHandler from '../../error';
import parserDto = require('../../../declare/parser');
import store from '../../store';
import Spinner from '../../spinner';
import * as iconv from 'iconv-lite';
import { cache } from 'sharp';

export default class Kukudm {
  /**
   * 解析漫画目录
   * @param { string } _url 漫画目录的链接
   */
  public async catalog(_url: string) {
    const { protocol, hostname } = url.parse(_url);
    const origin = `${protocol}//${hostname}`;
    const reqOptions = {
      method: 'GET',
      url: _url,
      responseType: 'arraybuffer'
    };
    const promise = axios.request(reqOptions)
      .then((resp) => {
        const data = iconv.decode(resp.data, 'GBK');
        const doc = cheerio.load(data);
        const matched = data.match(/\<td colspan=\'2\'\>(.*)漫画\<\/td\>/);
        const comicName = matched ? (matched[1] || '') : '';
        const chapterEles = doc('#comiclistn dd > a');
        const chapterList: any[] = [];
        for (let i = 0, len = chapterEles.length; i < len; i += 4) {
          const itemEle = chapterEles.eq(i);
          chapterList.push({
            title: itemEle.text(),
            url: url.resolve(origin, itemEle.attr('href'))
          });
        }
        const result: parserDto.CatalogParseResult = {
          comicName,
          chapterList
        };
        chapterList.reverse();
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
    const imgPrefix = 'http://n8.1whour.com/';
    const CancelToken = axios.CancelToken;
    const source = CancelToken.source();
    const reqOptions = {
      method: 'GET',
      url: _url,
      timeout: TIME_OUT,
      cancelToken: source.token,
      responseType: 'arraybuffer'
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
      const html = iconv.decode(resp.data, 'GBK');
      const doc = cheerio.load(html);
      const nextPage = doc(`table[bgcolor='#FFFFFF'] a`).last().attr('href');
      const matched = this.matchImgSrc(html);
      const imgSrcPart = matched ? (matched[1] || '') : '';
      const imgSrc = encodeURI(url.resolve(imgPrefix, imgSrcPart));
      const isLast = nextPage.includes('/exit/exit.htm');
      const parsedUrl = helper.parseUrl(imgSrc);
      const imgInfo: parserDto.ImgInfo = {
        isLast,
        referer: _url,
        next: encodeURI(url.resolve(origin, nextPage)),
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
        // setError();
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

  static encodeText(_text: string) {
    const buf = iconv.encode(_text, 'GBK');
    const hex = buf.toString('hex');
    const chars = hex.split('');
    let text = '';
    for (let i = 0, len = chars.length; i < len; i += 2) {
      const char = chars.slice(i, i + 2).join('');
      text += `%${char.toUpperCase()}`;
    }
    return text;
  }

  /**
   * 搜索漫画
   * @param { string } _keyword
   */
  static async search(_keyword: string) {
    const keyword = Kukudm.encodeText(_keyword);
    const searchUrl = `http://so.kukudm.com/search.asp?kw=${keyword}`;
    const reqOptions = {
      method: 'GET',
      url: searchUrl,
      responseType: 'arraybuffer'
    };
    const promise = axios.request(reqOptions)
      .then((resp) => {
        const data = iconv.decode(resp.data, 'GBK');
        const doc = cheerio.load(data);
        const eles = doc('#comicmain > dd > a');
        const searchList: parserDto.SearchListItem[] = [];
        for(let i = 0, len = eles.length; i < len; i += 3) {
          const itemEle = eles.eq(i + 1);
          const src = itemEle.attr('href');
          const name = itemEle.text().replace('漫画电信', '');
          searchList.push({ name, src });
        }
        return searchList;
      });

    return promise;
  }

  private matchImgSrc(_html: string) {
    let matched = _html.match(/\<img id\=comicpic name\=comicpic src\=.*\"(.*)\'\>/);
    if (!matched) {
      matched = _html.match(/\<IMG SRC\=\'.*\"(.*)\'\>/);
    }
    return matched;
  }
}
