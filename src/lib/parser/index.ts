import * as url from 'url';
import verydm from './verydm';

const HOST_NAME = {
  verydm: 'www.verydm.com'
};

export default {
  init(catalog: string) {
    const { hostname } = url.parse(catalog);
    switch(hostname) {
      case HOST_NAME.verydm:
        return verydm;

      default:
        return verydm;
    }
  }
};
