#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const program = require('commander');
const spider = require('../index');
const helper = require('../lib/helper');
const store = require('../lib/store');
const argvs = process.argv.slice(2);
const isNormalMode = !(argvs[0] && argvs[0].startsWith('-'));
const { CONFIG, SEARCH, MERGE, UNIT_CHAPTER, UNIT_PICTURE } = require('../config/constant');
const options = {};
const config = {};
const invokeStatus = {};
const isReadDefaultConfig = argvs.some((arg) => {
  return !arg.includes('http') && !arg.includes('catalogs');
});

const parseInfo = program
  .version(require('../package.json').version)
  .option('--config [filePath]', 'config file path', (configPath) => {
    options.mode = CONFIG;
    config.configPath = configPath;
    invokeStatus.config = true;
  })
  .option('--out [filePath]', 'file path of save dir', (outDir) => {
    if (!fs.existsSync(outDir)) {
      helper.warn('no such dir');
      process.exit();
    }
    config.outDir = outDir;
    invokeStatus.out = true;
  })
  .option('--catalogs [url]', 'catalog url list', (sender) => {
    const catalogs = sender.split(',');
    config.catalogs = catalogs;
    invokeStatus.catalogs = true;
  })
  .option('--search [string]', 'search comic keyword', (keyword) => {
    options.mode = SEARCH;
    config.keyword = keyword;
    invokeStatus.search = true;
  })
  .option('--start [string]', 'name of start-chapter', (startChapter) => {
    options.isRange = true;
    config.startChapter = startChapter;
    invokeStatus.start = true;
  })
  .option('--end [string]', 'name of end-chapter', (endChapter) => {
    options.isRange = true;
    config.endChapter = endChapter;
    invokeStatus.end = true;
  })
  .option('--range [string]', 'Separated by commas, such as 10,20', (rangeStr) => {
    const [startChapter = 0, endChapter] = rangeStr.split(',');
    options.isRange = true;
    config.startChapter = startChapter;
    config.endChapter = endChapter;
    invokeStatus.range = true;
  })
  .option('--chapter [string]', 'download designated chapter', (chapterName) => {
    options.isRange = true;
    config.startChapter = chapterName;
    config.endChapter = chapterName;
    invokeStatus.chapter = true;
  })
  .option('--volsize [number | string]', 'volume number(chapter or picture), such as 200(p) or 20c', (num) => {
    const unit = num.charAt(num.length - 1);
    const realNum = Number.parseInt(num);
    const realUnit = [UNIT_PICTURE, UNIT_CHAPTER].includes(unit) ? unit : UNIT_PICTURE;
    if (Number.isNaN(realNum)) {
      helper.warn('That is a wrong volume size');
      process.exit();
    }
    config.volSize = {
      num: realNum,
      unit: realUnit
    };
    invokeStatus.num = true;
  })
  .option('--merge [filepath]', 'comic dir path', (comicSrc) => {
    const srcDir = path.join(process.cwd(), comicSrc);
    const comicName = srcDir.split(path.sep).pop();
    options.mode = MERGE;
    config.comicSrc = srcDir;
    config.comicName = comicName;
    invokeStatus.merge = true;
  })
  .parse(process.argv);

(function __init() {
  const events = parseInfo._events;
  Object.keys(parseInfo._events).forEach((eventName) => {
    const optionName = eventName.split(':').pop();
    const isValid = parseInfo[optionName]
      && !['version'].includes(optionName)
      && !invokeStatus[optionName];
    isValid && events[eventName]();
  });

  if (isNormalMode) {
    config.catalogs = argvs.filter((arg) => {
      return arg.startsWith('http');
    });
  }

  if (isReadDefaultConfig) {
    const configPath = store.get('defaultConfigPath');
    events['option:config'](configPath);
  }

  spider.init(options, config);
})();
