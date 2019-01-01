#!/usr/bin/env node

const program = require('commander');
const spider = require('../index');
const store = require('../lib/store');
const argvs = process.argv.slice(2);
const isNormalMode = !(argvs[0] && argvs[0].startsWith('-'));
const isReadDefaultConfig = !argvs.length;
const options = {};
const config = {};

program
  .version(require('../package.json').version)
  .option('-i --init [filePath]', 'init variables file')
  .option('-l --list [url]', 'catalog url list', (list) => {
    config.catalogs = list;
  })
  .option('-s --search [comic]', 'search comic', (comicName) => {
    options.isSearch = true;
    config.comicName = comicName;
  })
  .option('-S --start [start chapter]', 'name of start-chapter', (startChapter) => {
    options.isRange = true;
    console.log(startChapter);
    config.startChapter = startChapter;
  })
  .option('-E --end [end chapter]', 'name of end-chapter', (endChapter) => {
    options.isRange = true;
    config.endChapter = endChapter;
  })
  .option('-n --num [vol num]', 'volume number(chapter or picture)', (num) => {
    const unit = num.charAt(num.length - 1);
    const realNum = Number.parseInt(num);
    const defaultUnit = realNum > 30 ? 'p' : 'c';
    const realUnit = ['p', 'c'].includes(unit) ? unit : defaultUnit;
    config.volSize = {
      num: realNum,
      unit: realUnit
    };
  })
  .option('-m --merge [comic dirname]', 'comic dirname', (comicName) => {
    options.isMerge = true;
    config.comicName = comicName;
  })
  .parse(process.argv);

if (program.init) {
  spider.init();
} else {
  if (isNormalMode) {
    config.catalogs = argvs;
  }
  
  if (isReadDefaultConfig) {
    config = spider.readConfig();
  }

  store.set({ options, ...config });

  if (options.isSearch) {
    spider.search(config.comicName);
  } else if (options.isMerge) {
    spider.merge();
  } else {
    spider.run(config.catalogs);
  }
}
