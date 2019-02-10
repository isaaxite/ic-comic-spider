import ora = require("ora");

export default class Spinner {
  static instance: ora.Ora;

  static getIns(_options?: string | ora.Options) {
    if (!Spinner.instance) {
      Spinner.instance = ora(_options);
    }
    return Spinner.instance;
  }
}
