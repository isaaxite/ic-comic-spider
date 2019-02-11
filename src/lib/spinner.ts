import ora = require("ora");

export default class Spinner {
  static startText: string = '';
  static instance: ora.Ora;

  static getIns(_options?: string | ora.Options) {
    if (!Spinner.instance) {
      Spinner.instance = ora(_options);
    }
    return Spinner.instance;
  }

  static invoke(order: string, ...rest: any | undefined) {
    const spinner = Spinner.getIns();
    if (order === 'start') {
      Spinner.startText = rest[0];
    }
    (spinner as any)[order](...rest);
    if (order !== 'succeed') {
      spinner.start(Spinner.startText);
    }
  }
}
