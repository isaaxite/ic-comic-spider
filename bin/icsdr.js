const program = require('commander')
const spider = require('../index');
const store = require('../lib/store');
const argvs = process.argv.slice(2);
const isNormalMode = !(argvs[0] && argvs[0].startsWith('-'));
const isReadDefaultConfig = !argvs.length;
const config = {};

program
  .version(require('../package.json').version)
  .option('-i --init [filePath]', 'init variables file')
  .option('-l --list [url]', 'catalog url list', function (list) {config.catcalogs = list})
  .option('-s --search [comic]', 'search comic', function (comic) {config.search = comic})
  .parse(process.argv)

if (program.init) {
  spider.init();
} else {
  if (isNormalMode) {
    config.catcalogs = argvs;
  }
  
  if (isReadDefaultConfig) {
    config = spider.readConfig();
  }

  store.set({ config });

  if (config.search) {
    spider.search(config.search);
  } else {
    spider.run(config.catcalogs);
  }
}

