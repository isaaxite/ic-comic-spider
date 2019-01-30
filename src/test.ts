import ErrorHandler from "./lib/error";
import * as path from 'path';
import { ERROR_TYPES } from './config/constant';

const errorHandler = new ErrorHandler('tempComic', { outDir: path.join(process.cwd(), '../comic') });

const temp = errorHandler.getSpeError(ERROR_TYPES.parse);
console.log(temp);
