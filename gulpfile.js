const tasks = require('./lib/tasks');
const helper = require('./lib/helper');
const ora = require('ora');

exports.init = async (catalogUrl) => {
  const { enName } = helper.parseCataLogUrl(catalogUrl);
  const spin = ora(`[${enName}] download...`).start();
  const { chapterList, comicName } = await tasks.parseCatalog(catalogUrl);
  await tasks.downloadComic(chapterList, comicName);
  await tasks.handleErrors(comicName);
  spin.succeed(`[${enName}] finish!`);
};
