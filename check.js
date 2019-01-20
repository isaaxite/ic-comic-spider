const fs = require('fs');
const path = require('path');
const helper = require('./lib/helper');
const checkDir = '/mnt/d/comics/我的英雄学院';
const chapterNames = helper.getFilteredDirContent(checkDir);
const chapterDirs = chapterNames.map((chapterName) => {
  return path.join(checkDir, chapterName);
});

helper.setDownloadError('temp', { a: 1 });
helper.setParseError('temp', { b: 2 });
process.exit();

const errorStatusList = {};
chapterDirs.forEach((chapterDir) => {
  const picNames = helper.getFilteredDirContent(chapterDir)
    .sort((prev, next) => {
      return Number.parseInt(prev) - Number.parseInt(next);
    });
  
  const status = {};
  picNames.forEach((item, index) => {
    const exceptedPicNo = index + 1;
    status[exceptedPicNo] = false;
  });
  picNames.forEach((picName, index) => {
    const picNo = Number.parseInt(picName);
    status[picNo] = true;
  });
  const errorStatus = {};
  Object.keys(status).forEach((key) => {
    if (!status[key]) {
      errorStatus[key] = status[key];
    }
  });
  const chapterName = path.basename(chapterDir);
  if (Object.keys(errorStatus).length) {
    errorStatusList[chapterName] = errorStatus;
  }
});

fs.writeFileSync('./check.json', JSON.stringify(errorStatusList, null, 2));