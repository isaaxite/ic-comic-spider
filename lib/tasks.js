const fs = require('fs');
const path = require('path');
const ora = require('ora');
const cheerio = require('cheerio');
const axios = require('axios');
const helper = require('./helper');
const store = require('./store');
const merge = require('./merge');
const { CONFIG_TEMPLATE, UNIT_CHAPTER, UNIT_PICTURE } = require('../config/constant');

const self = {
  _parseUrl(url) {
    const parts = url.split('/');
    const content = parts.pop();
    const prefix = url.slice(0, url.length - content.length);
    const [ name, format ] = content.split('.');
    const index = Number.parseInt(name);
    return { prefix, content, name, format, index };
  },

  async _parseComicCount(url) {
    const count = await axios.get(url).then((resp) => {
      const doc = cheerio.load(resp.data);
      const count = doc('select > option').length;
      return Promise.resolve(count);
    }, (error) => {
      console.error(error);
    });
    return count;
  },

  async _parseChapterPage(comicName, chapterName, url, pageNo) {
    const referer = `${url}&p=${pageNo}`;
    const imgInfo = await axios.get(referer).then((resp) => {
      const doc = cheerio.load(resp.data);
      const imgSrc = doc('#mainImage2').attr('src');
      const parsedUrl = this._parseUrl(imgSrc);
      return Promise.resolve({
        referer,
        ...parsedUrl
      });
    }, (error) => {
      helper.setParseError(comicName, chapterName, url);
    });

    return imgInfo;
  },

  async _downloadChapter(comicName, chapterName, chapterUrl) {
    const count = await self._parseComicCount(chapterUrl);
    const promiseList = [];
    for (let i = 0; i < count; i += 1) {
      const pageNo = i + 1;
      const imgSrcInfo = await self._parseChapterPage(comicName, chapterName, chapterUrl, pageNo);
      if (imgSrcInfo) {
        const { savePath } = helper.getSavePath(comicName, chapterName, imgSrcInfo.content);
        const imgStream = await this._downloadPic(comicName, chapterName, imgSrcInfo);
        imgStream && imgStream.pipe(fs.createWriteStream(savePath));
      }
    }
  },

  async _downloadPic(comicName, chapterName, imgInfo) {
    const imgSrc = imgInfo.prefix + imgInfo.content;
    const options = {
      method: 'GET',
      responseType:'stream',
      headers: { 'Referer': imgInfo.referer },
      url: imgSrc,
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
      helper.setDownloadError(comicName, {
        chapter: chapterName,
        imgInfo
      });
    });

    return imgStream;
  },

  async _handleDownloadErrors(comicName, downloadErrors) {
    if (downloadErrors.length) {
      await Promise.resolve();
      for (const downloadError of downloadErrors) {
        const { chapter: chapterName, imgInfo } = downloadError;
        const { savePath } = helper.getSavePath(comicName, chapterName, imgInfo.content);
        const imgStream = await this._downloadPic(imgInfo);
        imgStream && imgStream.pipe(fs.createWriteStream(savePath));
      }
    }
  },

  async _handleParseErrors(comicName, parsedErrors) {
    if (parsedErrors.length) {
      for (const parsedError of parsedErrors) {
        const { chapter, url } = parsedError;
        await this._downloadChapter(comicName, chapter, url);
      }
    }
  }
};

exports.parseCatalog = async (url) => {
  const { domain } = helper.parseCataLogUrl(url);
  const result = await axios.get(url).then((resp) => {
    const doc = cheerio.load(resp.data);
    const comicName = doc('.comic-name h1').text();
    const chapterEles = doc('.chapters li > a');
    const chapterList = helper.mapEles(chapterEles, (ele, index) => {
      return {
        title: ele.attr('title'),
        url: `${domain}/${ele.attr('href')}`
      };
    });
    chapterList.reverse();
    return Promise.resolve({
      comicName,
      chapterList
    });
  });

  return result;
};

exports.downloadComic = async (chapterList, comicName) => {
  const imgSrcInfoList = [];
  for (let i = 0, len = chapterList.length; i < len; i += 1) {
    const { url: chapterUrl, title: chapterName } = chapterList[i];
    const { chapterDir } = helper.getSavePath(comicName, chapterName);
    const isExistChapter = fs.readdirSync(chapterDir).length;

    if (!isExistChapter) {
      await self._downloadChapter(comicName, chapterName, chapterUrl);
    }
  }
};

exports.run = async () => {
  const { catalogs: catalogUrlList } = store.get();
  if (!catalogUrlList || !catalogUrlList.length) {
    helper.warn('please config the catalogs');
    process.exit();
  }
  for (const catalogUrl of catalogUrlList) {
    const { enName } = helper.parseCataLogUrl(catalogUrl);
    const spin = ora(`[${enName}] download...`).start();
    const { chapterList, comicName } = await exports.parseCatalog(catalogUrl);
    const realChapterList = helper.clipChapterList(chapterList);
    await exports.downloadComic(realChapterList, comicName);
    await exports.handleErrors(comicName);
    spin.succeed(`[${enName}] finish!`);
  }
};

exports.search = async () => {
  const keyword = store.get('keyword');
  const spin = ora(`search ${keyword}...`).start();
  const url = `http://www.verydm.com/index.php?r=comic%2Fsearch&keyword=${encodeURIComponent(keyword)}`;
  const searchList = await axios.get(url).then((resp) => {
    const doc = cheerio.load(resp.data);
    const eles = doc('.main-container .list li');
    const searchList = helper.mapEles(eles, (ele, index) => {
      const itemEle = cheerio.load(`<li>${ele}</li>`);
      const name = itemEle('p > a').text();
      const url = itemEle('li > a').attr('href');
      return { name, url };
    }).filter((item) => {
      return item.name;
    });
    return searchList;
  });
  spin.succeed([
    `search result: ${searchList.length || 'null'}`,
    ...searchList.map((item) => {
      return `${item.name}: ${item.url}`;
    })
  ].join('\n'));
};

exports.merge = () => {
  const { volSize, comicName } = store.get();
  const { unit, num } = volSize;
  const spin = ora(`merging ${comicName}...`).start();
  switch (unit) {
    case UNIT_PICTURE:
      merge.baseOnPictureCount(num);
      break;
    case UNIT_CHAPTER:
      merge.baseOnChapterCount(num);
      break;
    default:
      helper.warn('wrong operation');
  }
  spin.succeed('finish');
};

exports.config = () => {
  const { configPath, defaultConfigPath } = store.get();
  if (!configPath || !fs.existsSync(configPath)) {
    // init config file
    const configTemplate = JSON.stringify(CONFIG_TEMPLATE, null, 2);
    const filePath = configPath || defaultConfigPath;
    fs.writeFileSync(filePath, configTemplate);
    helper.succeed('init config file succeed!');
  } else {
    // read config file
    const fullPath = path.resolve(process.cwd(), configPath);
    const userConfig = helper.getConfig(fullPath);
    const config = {};
    Object.keys(userConfig).forEach((key) => {
      const item = userConfig[key];
      if (item) {
        config[key] = item;
      }
    });
    store.set(config);
    exports.run();
  }
};

exports.handleErrors = async (comicName) => {
  const downloadErrors = helper.getDownloadErrors(comicName);
  const parsedErrors = helper.getParsedErrors(comicName);
  helper.clearErrors(comicName);
  await self._handleDownloadErrors(comicName, downloadErrors);
  await self._handleParseErrors(comicName, parsedErrors);
};
