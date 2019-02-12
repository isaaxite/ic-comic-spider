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

export default class Chuixue {
  private imgOrigins: string[] = ['http://2.csc1998.com/', 'http://img.csc1998.com/'];
  private viewidThreshold: number = 519253;
  private imgSrcList: string[] = [];

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
        const comicName = doc('#intro_l > .title > h1').text();
        const chapterEles = doc('#play_0 li > a');
        const len = chapterEles.length;
        const chapterList = helper.mapEles(chapterEles, (_ele: any, _index: number) => {
          const chapterNo = len - _index;
          return {
            title: `${chapterNo}_${_ele.attr('title')}`,
            url: url.resolve(origin, _ele.attr('href'))
          };
        });
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
  public async chapterPage(_url: string, _options?: any) {
    const options = _options || {};
    const pageNo: number = options.pageNo;
    if (!pageNo) {
      const errorHandler = ErrorHandler.getIns();
      errorHandler.setParsedError({
        chapter: options.chapterName,
        url: _url
      });
      return ;
    }
    if (pageNo === 1) {
      this.imgSrcList = [];
    }
    if (!this.imgSrcList.length) {
      const imgSrcList = await this.chapter(_url, _options);
      if (imgSrcList) {
        this.imgSrcList = imgSrcList;
      }
    }
    const imgIndex = pageNo - 1;
    const imgSrc = this.imgSrcList[imgIndex];
    const isLast = !imgSrc;
    if (isLast) {
      return ;
    }
    const parsedUrl = helper.parseUrl(imgSrc);
    const imgInfo: parserDto.ImgInfo = {
      isLast,
      referer: _url,
      next: _url,
      ...parsedUrl
    };
    return Promise.resolve(imgInfo);
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
  static async search(_keyword: string) {
    const keyword = Chuixue.encodeText(_keyword);
    const origin = 'http://www.chuixue.net/';
    const searchUrl = `http://www.chuixue.net/e/search/?searchget=1&show=title,player,playadmin,pinyin&keyboard=${keyword}`;
    const reqOptions = {
      method: 'GET',
      url: searchUrl,
      responseType: 'arraybuffer'
    };
    const promise = axios.request(reqOptions)
      .then((resp) => {
        const html = iconv.decode(resp.data, 'GBK');
        const doc = cheerio.load(html);
        const eles = doc('#dmList li dt > a');
        const searchList: parserDto.SearchListItem[] = helper.mapEles(eles, (_ele: any, _index: number) => {
          const name = _ele.attr('title');
          const src = url.resolve(origin, _ele.attr('href'));
          return { name, src };
        }).filter((item: any) => {
          return item.name;
        });
        return searchList;
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
   * 获取图片origin
   * @param { number } viewId
   */
  private getImgOrigin(viewId: number) {
    let origin: string;

    if (viewId >= this.viewidThreshold) {
      origin = this.imgOrigins[0];
    } else {
      origin = this.imgOrigins[1];
    }
    return origin;
  }

  /**
   * 获取图片链接的后半部分
   * @param { string } _doc html文本
   */
  private getImgPaths(_doc: string) {
    const photosr: string[] = [];
    const packedMatcheds = _doc.match(/packed=\"(.*)\"\;/);
    const packed = packedMatcheds && packedMatcheds[1];
    if (packed) {
      const temp = Buffer.from(packed, 'base64').toString();
      eval(eval(temp.slice(4)));
      photosr.shift();
    } else {
      const photosrMatched = _doc.match(/photosr\[.+\] =\".*";/);
      if (photosrMatched) {
        eval(photosrMatched[0]);
        photosr.shift();
      }
    }

    return photosr;
  }

  /**
   * 组合img的origin和 paths
   * @param { string } _origin
   * @param { string[] } _paths
   */
  private generateImgSrcs(_origin: string, _paths: string[]) {
    const srcs: string[] = _paths.map((imgPath) => {
      return url.resolve(_origin, imgPath);
    });
    return srcs;
  }

  /**
   * 解析章节某一页漫画的图片信息
   * @param { string } _url 章节中的某一页漫画的page url
   * @param { any } _options 可选
   */
  private async chapter(_url: string, _options: any) {
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
    const promise: Promise<string[] | void> = axios.request(reqOptions).then((resp) => {
      const doc = resp.data || '';
      const viewId: number = doc.match(/var viewid = \"(.*)\"\;/)[1];
      const origin = this.getImgOrigin(viewId);
      const imgPaths = this.getImgPaths(doc);
      const imgSrcList = this.generateImgSrcs(origin, imgPaths);
      return Promise.resolve(imgSrcList);
    }).catch(async (error) => {
      const errMsg = error.message || '';
      const isTimeout = errMsg.includes('timeout');

      if (axios.isCancel(error)) {
        return ;
      }

      if (isTimeout) {
        return this.chapter(_url, _options);
      } else {
        Spinner.invoke('warn', `parse fail: [${_options.chapterName}]${_url}`);
        setError();
      }
    }).finally(() => {
      clearTimeout(noRespHandler);
    });

    return promise;
  }

  public async test(_url: string) {
    const reqOptions = {
      method: 'GET',
      url: _url,
      timeout: TIME_OUT
    };
    axios.request(reqOptions).then((resp) => {
      const doc = resp.data || '';
      const viewId: number = doc.match(/var viewid = \"(.*)\"\;/)[1];
      const origin = this.getImgOrigin(viewId);
      const imgPaths = this.getImgPaths(doc);
      this.imgSrcList = this.generateImgSrcs(origin, imgPaths);
    })
  }
}
