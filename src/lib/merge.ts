import * as fs from 'fs';
import * as path from 'path';
import store from './store';
import * as helper from './helper';

export default {
  baseOnPictureCount(_volSize: number) {
    let picCount = 0;
    let picIndex = 1;
    let volIndex = 1;
    const { comicSrc, comicName, outDir } = store.get();
    const volComicDir = helper.mkDir(outDir, `${comicName}(vol_pre_${_volSize}pics)`);
    const chapters = helper.getComicDirContent(comicSrc);
    chapters.forEach((chapter, chapterIndex) => {
      const chapterDir = path.join(comicSrc, chapter.name);
      const pics = helper.getDirContent(chapterDir);
      if (picCount > _volSize) {
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

  baseOnChapterCount(_volSize: number) {
    let picIndex = 1;
    const { comicName, outDir } = store.get();
    const comicDir = helper.mkDir(outDir, comicName);
    const volComicDir = helper.mkDir(outDir, `${comicName}(vol_pre_${_volSize}chapters)`);
    const chapters = helper.getComicDirContent(comicDir);
    
    chapters.forEach((chapter, chapterIndex) => {
      const chapterDir = path.join(comicDir, chapter.name);
      const volIndex = Math.floor(chapterIndex / _volSize) + 1;
      if ( (chapterIndex) % _volSize === 0 ) {
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
