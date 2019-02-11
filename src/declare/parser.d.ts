export = parserDto;

declare namespace parserDto {
  interface ImgInfo {
    url: string;

    prefix: string;

    content: string;

    name: string;

    format: string;

    index: number;

    referer: string;

    next: string;

    [key: string]: any;
  }

  interface SearchListItem {
    name: string;

    src: string;
  }

  interface ChapterListItem {
    title: string;

    url: string;
  }

  interface CatalogParseResult {
    comicName: string;

    chapterList: ChapterListItem[];
  }

  interface BaseParser {
    /**
     * 解析漫画目录
     * @param { string } _url 漫画目录的链接
     */
    catalog(_url: string): Promise<parserDto.CatalogParseResult>;

    /**
     * 解析章节某一页漫画的图片信息
     * @param { string } _url 章节中的某一页漫画的page url
     * @param { number } _pageNo 页码
     * @param { any } _options 可选
     */
    chapterPage(_url: string, _options: any): Promise<void | parserDto.ImgInfo>;

    /**
     * 下载漫画图片
     * @param _chapterName 章节名
     * @param _imgInfo 待下载的图片信息
     */
    downloadPic(_chapterName: string, _imgInfo: parserDto.ImgInfo): Promise<any>;

    /**
     * 搜索漫画
     * @param { string } _keyword
     */
    search(_keyword: string): Promise<parserDto.SearchListItem>;
  }
}
