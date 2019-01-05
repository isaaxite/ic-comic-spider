const fs = require('fs');
const path = require('path');
const store = require('./store');
const helper = require('./helper');

module.exports = {
  baseOnPictureCount(volSize) {
    let picCount = 0;
    let picIndex = 1;
    let volIndex = 1;
    const { comicSrc, comicName, outDir } = store.get();
    const volComicDir = helper.mkDir(outDir, `${comicName}(vol_pre_${volSize}pics)`);
    const chapters = helper.getComicDirContent(comicSrc);
    chapters.forEach((chapter, chapterIndex) => {
      const chapterDir = path.join(comicSrc, chapter.name);
      const pics = helper.getDirContent(chapterDir);
      if (picCount > volSize) {
        picIndex = 1;
        volIndex += 1;
        picCount = 0;
      }
      const volDir = helper.mkDir(volComicDir, `vol_${volIndex}`);
      pics.forEach((pic) => {
        const format = pic.name.split('.').pop();
        const picPath = path.join(chapterDir, pic.name);
        const savePath = path.join(volDir, `${picIndex}.${format}`);
        const data = fs.readFileSync(picPath);
        fs.writeFileSync(savePath, data);
        picIndex += 1;
      });
      picCount += pics.length;
    });
  },

  baseOnChapterCount(volSize) {
    let picIndex = 1;
    const { comicName, outDir } = store.get();
    const comicDir = helper.mkDir(outDir, comicName);
    const volComicDir = helper.mkDir(outDir, `${comicName}(vol_pre_${volSize}chapters)`);
    const chapters = helper.getComicDirContent(comicDir);
    
    chapters.forEach((chapter, chapterIndex) => {
      const chapterDir = path.join(comicDir, chapter.name);
      const volIndex = Math.floor(chapterIndex / volSize) + 1;
      if ( (chapterIndex) % volSize === 0 ) {
        picIndex = 1;
      }
      const pics = helper.getDirContent(chapterDir);
      const volDir = helper.mkDir(volComicDir, `vol_${volIndex}`);
      pics.forEach((pic) => {
        const format = pic.name.split('.').pop();
        const picPath = path.join(chapterDir, pic.name);
        const savePath = path.join(volDir, `${picIndex}.${format}`);
        const data = fs.readFileSync(picPath);
        fs.writeFileSync(savePath, data);
        picIndex += 1;
      });
    });
  }
};
