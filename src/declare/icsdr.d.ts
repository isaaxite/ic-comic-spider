export = icsdr;
declare namespace icsdr {
  interface Options {
    mode: string;
  
    isRange?: boolean;
  
    isCrop?: boolean;
  }
  
  interface VolumSize {
    num: number;
  
    unit: string;
  }
  
  interface Config {
    configPath: string;
  
    outDir?: string;
  
    catalogs?: string[];
  
    keyword?: string;
  
    startChapter?: string;
  
    endChapter?: string;
  
    volSize?: VolumSize;
  
    comicSrc?: string;
  
    comicName?: string;
  
    isSwap?: boolean;

    cropDir?: string[];
  }

  class Options implements Options {
    constructor(...args) {
      super(...args);
    }
  }

  class Config implements Config {
    constructor(...args) {
      super(...args);
    }
  }
}
