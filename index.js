const fs = require('fs');
const path =require('path');
const tasks = require('./lib/tasks');
const helper = require('./lib/helper');
const ora = require('ora');

exports.init = () => {
  const configPath = path.resolve(process.cwd(), './config.json');
  const defaultConfig = {
    comic: "",
    catalogs: [],
    out: ""
  };

  if (!fs.existsSync(configPath)) {
    fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2));
  }
};

exports.readConfig = (_configPath) => {
  let config = {};
  try {
    const defaultConfigPath = path.resolve(process.cwd(), './config.json');
    const configPath = _configPath || defaultConfigPath;
    config = require(configPath);
  } catch (error) {
    console.log('can not found the config.json');
  }
  return config;
};

exports.run = async (catalogUrlList) => {
  for (const catalogUrl of catalogUrlList) {
    const { enName } = helper.parseCataLogUrl(catalogUrl);
    const spin = ora(`[${enName}] download...`).start();
    const { chapterList, comicName } = await tasks.parseCatalog(catalogUrl);
    await tasks.downloadComic(chapterList, comicName);
    await tasks.handleErrors(comicName);
    spin.succeed(`[${enName}] finish!`);
  }
};

exports.search = (keyword) => {
  tasks.search(keyword);
}

exports.merge = () => {
  return tasks.merge();
}
