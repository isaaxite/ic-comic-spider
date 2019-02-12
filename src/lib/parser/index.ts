import * as url from 'url';
import Verydm from './verydm/index';
import Kukudm from './kukudm/index';
import parserDto = require('../../declare/parser');
import { HOST_NAME } from '../../config/constant';
import Chuixue from './chuixue';

export default class Parser implements parserDto.BaseParser {
  private baseParser: parserDto.BaseParser;

  constructor(_url: string) {
    const { hostname } = url.parse(_url);
    switch (hostname) {
      case HOST_NAME.verydm:
        this.baseParser = new Verydm();
        break;
      
      case HOST_NAME.kukudm:
        this.baseParser = new Kukudm();
        break;

      case HOST_NAME.chuixue:
        this.baseParser = new Chuixue();
        break;

      default:
        this.baseParser = new Verydm();
    }
  }

  /**
   * 解析漫画目录
   * @param { string } _url 漫画目录的链接
   */
  public async catalog(_url: string) {
    return this.baseParser.catalog(_url);
  }

  /**
   * 解析章节某一页漫画的图片信息
   * @param { string } _url 章节中的某一页漫画的page url
   * @param { number } _pageNo 页码
   * @param { any } _options 可选
   */
  public async chapterPage(_url: string, _options: any) {
    return this.baseParser.chapterPage(_url, _options);
  }

  /**
   * 下载漫画图片
   * @param _chapterName 章节名
   * @param _imgInfo 待下载的图片信息
   */
  public async downloadPic(_chapterName: string, _imgInfo: parserDto.ImgInfo) {
    return this.baseParser.downloadPic(_chapterName, _imgInfo);
  }

  /**
   * 搜索漫画
   * @param { string } _keyword
   */
  static async search(_keyword: string) {
    const searchRes: any = [];
    const searchFnList = [Verydm.search, Chuixue.search, Kukudm.search];
    for (const _search of searchFnList) {
      const list = await _search(_keyword);
      searchRes.push(...list);
    }
    return searchRes;
  }
}
