import sharp = require('sharp');

export default {
  init(picPath: string, options: any = {}) {
    const { metadata, isSwap = true } = options;
    if (!metadata) {
      throw new Error('except picture metadata<{ width: number, height: number }>')
    }
    const correctedWdith = metadata.width - 2;
    const exceptedWidth = Math.floor(correctedWdith / 2);
    const leftPosList = [0, correctedWdith - exceptedWidth];
    
    const cropedPic = leftPosList.map((left) => {
      return sharp(picPath)
        .extract({
          left,
          top: 0,
          width: exceptedWidth,
          height: metadata.height
        });
    });
    isSwap && cropedPic.reverse();
    return cropedPic;
  }
};
