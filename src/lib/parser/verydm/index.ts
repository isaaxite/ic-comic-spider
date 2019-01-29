import * as url from 'url';
import axios from 'axios';
import * as cheerio from 'cheerio';
import * as helper from '../../helper';

export default {
  async catalog(_url: string) {
    const { protocol, hostname } = url.parse(_url);
    const origin = `${protocol}//${hostname}`;
    const result = await axios.get(_url).then((resp) => {
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
      return Promise.resolve({
        comicName,
        chapterList
      });
    });
  
    return result;
  },

  async comicCount(_url: string) {
    const count = await axios.get(_url).then((resp) => {
      const doc = cheerio.load(resp.data);
      const count = doc('select > option').length;
      return Promise.resolve(count);
    }, (error) => {
      console.error(error);
    });
    return count;
  },

  async chapterPage(_url: string, _pageNo: number, _options: any) {
    const referer = `${_url}&p=${_pageNo}`;
    const imgInfo = await axios.get(referer).then((resp) => {
      const doc = cheerio.load(resp.data);
      const imgSrc = doc('#mainImage2').attr('src');
      const parsedUrl = helper.parseUrl(imgSrc);
      return Promise.resolve({
        referer,
        ...parsedUrl
      });
    }, (error) => {
      helper.setParseError(_options.chapterName, _url);
    });

    return imgInfo;
  },

  async downloadPic(_chapterName: string, _imgInfo: any) {
    const options = {
      method: 'GET',
      responseType:'stream',
      headers: { 'Referer': _imgInfo.referer },
      url: _imgInfo.url,
    };
    const imgStream = await axios(options).then((resp) => {
      const isValid = resp.statusText === 'OK';
      if (isValid) {
        return Promise.resolve(resp.data);
      } else {
        helper.setDownloadError({
          chapter: _chapterName,
          imgInfo: _imgInfo
        });
      }
    })
    .catch((error) => {
      helper.setDownloadError({
        chapter: _chapterName,
        imgInfo: _imgInfo
      });
    });

    return imgStream;
  },

  async search(_keyword: string) {
    const searchUrl = `http://www.verydm.com/index.php?r=comic%2Fsearch&keyword=${encodeURIComponent(_keyword)}`;
    const searchList = await axios.get(searchUrl).then((resp) => {
      const doc = cheerio.load(resp.data);
      const eles = doc('.main-container .list li');
      const searchList = helper.mapEles(eles, (_ele: any, _index: number) => {
        const itemEle = cheerio.load(`<li>${_ele}</li>`);
        const name = itemEle('p > a').text();
        const src = itemEle('li > a').attr('href');
        return { name, src };
      }).filter((item: any) => {
        return item.name;
      });
      return searchList;
    });
    return searchList;
  }
};
