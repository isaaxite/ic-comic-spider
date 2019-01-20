const url = require('url');
const axios = require('axios');
const cheerio = require('cheerio');
const helper = require('../../helper');

module.exports = {
  async catalog(_url) {
    const { protocol, hostname } = url.parse(_url);
    const origin = `${protocol}//${hostname}`;
    const result = await axios.get(_url).then((resp) => {
      const doc = cheerio.load(resp.data);
      const comicName = doc('.comic-name h1').text();
      const chapterEles = doc('.chapters li > a');
      const chapterList = helper.mapEles(chapterEles, (ele, index) => {
        return {
          title: ele.attr('title'),
          url: url.resolve(origin, ele.attr('href'))
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

  async comicCount(_url) {
    const count = await axios.get(_url).then((resp) => {
      const doc = cheerio.load(resp.data);
      const count = doc('select > option').length;
      return Promise.resolve(count);
    }, (error) => {
      console.error(error);
    });
    return count;
  },

  async chapterPage(_url, _pageNo, _options) {
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

  async downloadPic(chapterName, imgInfo) {
    const options = {
      method: 'GET',
      responseType:'stream',
      headers: { 'Referer': imgInfo.referer },
      url: imgInfo.url,
    };
    const imgStream = await axios(options).then((resp) => {
      const isValid = resp.statusText === 'OK';
      if (isValid) {
        return Promise.resolve(resp.data);
      } else {
        helper.setDownloadError(comicName, {
          chapter: chapterName,
          imgInfo
        });
      }
    })
    .catch((error) => {
      helper.setDownloadError({
        chapter: chapterName,
        imgInfo
      });
    });

    return imgStream;
  },

  async search(_keyword) {
    const searchUrl = `http://www.verydm.com/index.php?r=comic%2Fsearch&keyword=${encodeURIComponent(_keyword)}`;
    const searchList = await axios.get(searchUrl).then((resp) => {
      const doc = cheerio.load(resp.data);
      const eles = doc('.main-container .list li');
      const searchList = helper.mapEles(eles, (ele, index) => {
        const itemEle = cheerio.load(`<li>${ele}</li>`);
        const name = itemEle('p > a').text();
        const src = itemEle('li > a').attr('href');
        return { name, src };
      }).filter((item) => {
        return item.name;
      });
      return searchList;
    });
    return searchList;
  }
};
