const fs = require('fs');
const axios = require('axios');
const cheerio = require('cheerio');
const path = require('path');
const searchUrl = 'http://www.verydm.com/index.php?r=comic%2Fsearch&keyword=';

class IcComicSpider {
  constructor(url, saveDir) {
    this._url = url;
    this._domain = url.match(/.*com/g)[0];
    this.saveDir = path.resolve(__dirname, `./${saveDir}`);
    this.comicDir = path.join(this.saveDir, `/${Date.now()}`);
  }

  async init() {
    const { name, chaptersInfo } = await this._parseCatalog();
    // return console.log(chaptersInfo);
    const comicDir = this._initComicDir(name);
    for (const chapterInfo of chaptersInfo) {
      const chapterDir = path.join(comicDir, `/${chapterInfo.title}`);
      const imgSrcInfo = await this._parseComicPage(chapterInfo);
      await this._downloadChapters(imgSrcInfo, chapterDir);
    }
  }

  _initComicDir(name) {
    const comicDir = path.join(this.saveDir, `/${name}`);
    if (fs.existsSync(comicDir)) {
      fs.mkdirSync(comicDir);
    }
    return comicDir;
  } 

  _indexAdd1(index) {
    const len = index.length;
    const realIndex = String(Number.parseInt(index) + 1);
    const realIndexLen = realIndex.length;
    const prefix = new Array(len - realIndexLen).fill('0').join('');
    return `${prefix}${realIndex}`;
  }

  _map(eles, callback) {
    const arr = [];
    for (let i = 0, len = eles.length; i < len; i += 1) {
      const ele = eles.eq(i);
      if (callback) {
        const res = callback(ele, i);
        arr.push(res);
      }
    }
    return arr;
  }

  _parseCatalog() {
    // return Promise.resolve([
    //   {
    //     title: '第94话',
    //     url: 'http://www.verydm.com/chapter.php?id=93932'
    //   },
    //   {
    //     title: '第93话',
    //     url: 'http://www.verydm.com/chapter.php?id=93424'
    //   }
    // ]);
    return axios.get(this._url)
      .then((resp) => {
        const doc = cheerio.load(resp.data);
        const name = doc('.comic-name h1').text();
        const linkEles = doc('.chapters li > a');
        const chaptersInfo = this._map(linkEles, (ele, index) => {
          return {
            title: ele.attr('title'),
            url: `${this._domain}/${ele.attr('href')}`
          };
        });
        chaptersInfo.reverse();
        return Promise.resolve({
          name,
          chaptersInfo
        });
      });
  }

  _parseUrl(url) {
    const parts = url.split('/');
    const content = parts.pop();
    const prefix = url.slice(0, url.length - content.length);
    const [ name, format ] = content.split('.');
    const index = Number.parseInt(name);
    return { prefix, content, name, format, index };
  }

  _parseComicPage(chapterInfo, partNo = 1) {
    const { title, url } = chapterInfo;
    return axios.get(url)
      .then((resp) => {
        const doc = cheerio.load(resp.data);
        const imgSrc = doc('#mainImage2').attr('src');
        const count = doc('select > option').length;
        const parsedUrl = this._parseUrl(imgSrc);
        return Promise.resolve({
          count,
          referer: `${url}&p=${parsedUrl.index}`,
          ...parsedUrl
        });
      }, (error) => {
        console.error(error);
      });
  }

  _updateImgSrcInfo(info, name) {
    const newIndex = Number.parseInt(name);
    const refererTemp = info.referer.split('&p=')[0];
    info.name = name;
    info.index = newIndex;
    info.content = `${info.name}.${info.format}`;
    info.referer = `${refererTemp}&p=${newIndex}`;
    return info;
  }

  _downloadComicPic(imgSrcInfo, chapterDir) {
    const imgUrl = imgSrcInfo.prefix + imgSrcInfo.content;
    const options = {
      method: 'GET',
      responseType:'stream',
      headers: { 'Referer': imgSrcInfo.referer },
      url: imgUrl,
    };
    return axios(options).then((resp) => {
      const isValid = resp.statusText === 'OK';
      if (isValid) {
        const savePath = path.join(chapterDir, `/${imgSrcInfo.content}`);
        console.log(imgUrl);
        resp.data.pipe(fs.createWriteStream(savePath));
      } else {
        console.log('download fail');
      }
    })
    .catch((error) => {
      console.error(error);
    });
  }

  async _downloadChapters(_imgSrcInfo, _chapterDir) {
    let imgSrcInfo = _imgSrcInfo;
    let counter = 0;
    const { count } = imgSrcInfo;
    if (!fs.existsSync(_chapterDir)) {
      fs.mkdirSync(_chapterDir);
    }
    while (counter < count) {
      const { name } = imgSrcInfo;
      const newName = this._indexAdd1(name);
      await this._downloadComicPic(imgSrcInfo, _chapterDir);
      imgSrcInfo = this._updateImgSrcInfo(imgSrcInfo, newName);
      counter += 1;
    }
  }

  test() {
    // request('')
    const imgSrcInfo = {
      referer: 'http://www.verydm.com/chapter.php?id=93932&p=1',
      prefix: 'http://imgn1.magentozh.com:8090//y/ybnpbner/ch_94/',
      content: '001.jpg',
      name: '001',
      format: 'jpg',
      index: 1
    };
    const newName = this._indexAdd1(imgSrcInfo.name);
    const newInfo = this._updateImgSrcInfo(imgSrcInfo, newName);
    console.log(newInfo);
  }
}

const ins = new IcComicSpider('http://www.verydm.com/manhua/yuedingmhd', 'src');
// ins.test();
ins.init();
