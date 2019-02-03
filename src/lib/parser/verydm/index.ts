import * as url from 'url';
import axios from 'axios';
import * as cheerio from 'cheerio';
import * as helper from '../../helper';
import { ERROR_TYPES } from '../../../config/constant';
import ErrorHandler from '../../error';
import parserDto = require('../../../declare/parser');

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

  public async comicCount(_url: string) {
    const count = await axios.get(_url).then((resp) => {
      const doc = cheerio.load(resp.data);
      const count = doc('select > option').length;
      return Promise.resolve(count);
    }, (error) => {
      console.error(error);
    });
    return count;
  }

  /**
   * 解析章节某一页漫画的图片信息
   * @param { string } _url 章节中的某一页漫画的page url
   * @param { number } _pageNo 页码
   * @param { any } _options 可选
   */
  public async chapterPage(_url: string, _pageNo: number, _options: any) {
    const referer: string = `${_url}&p=${_pageNo}`;
    const promise = axios.get(referer)
      .then((resp) => {
        const doc = cheerio.load(resp.data);
        const imgSrc = doc('#mainImage2').attr('src');
        const parsedUrl = helper.parseUrl(imgSrc);
        const imgInfo: parserDto.ImgInfo = {
          referer,
          ...parsedUrl
        };
        return Promise.resolve(imgInfo);
      })
      .catch(() => {
        const errorHandler = ErrorHandler.getIns();
        errorHandler.setParsedError({
          chapter: _options.chapterName,
          url: _url
        })
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
    };
    const setError = (chapter: string, imgInfo: parserDto.ImgInfo) => {
      const errorHandler = ErrorHandler.getIns();
      errorHandler.setDownloadError({
        chapter,
        imgInfo
      });
    };
    const promise = axios(options)
      .then((resp) => {
        const isValid = resp.statusText === 'OK';
        if (isValid) {
          return Promise.resolve(resp.data);
        } else {
          setError(_chapterName, _imgInfo);
        }
      })
      .catch(() => {
        setError(_chapterName, _imgInfo);
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
