import fs from 'node:fs';
import path from 'node:path';
import { BRAND_CONFIG } from './config.js';
import { logger } from '../server/logger.js';

export interface FontDescriptors {
  [family: string]: {
    normal: string;
    bold: string;
    italics: string;
    bolditalics: string;
  };
}

export function resolveFontPaths(): FontDescriptors {
  const baseDir = process.cwd();
  const robotoDir = path.join(baseDir, 'node_modules/pdfmake/fonts/Roboto');
  
  const roboto = {
    normal: path.join(robotoDir, 'Roboto-Regular.ttf'),
    bold: path.join(robotoDir, 'Roboto-Medium.ttf'),
    italics: path.join(robotoDir, 'Roboto-Italic.ttf'),
    bolditalics: path.join(robotoDir, 'Roboto-MediumItalic.ttf')
  };

  const headerPath = path.join(baseDir, BRAND_CONFIG.paths.fontsDir, BRAND_CONFIG.paths.headerFile);
  const bodyPath = path.join(baseDir, BRAND_CONFIG.paths.fontsDir, BRAND_CONFIG.paths.bodyFile);

  const hasHeader = fs.existsSync(headerPath);
  const hasBody = fs.existsSync(bodyPath);

  if (!hasHeader) {
    logger.warn(`Premium header font not found at ${headerPath}. Falling back to Roboto.`);
  }

  if (!hasBody) {
    logger.warn(`Premium body font not found at ${bodyPath}. Falling back to Roboto.`);
  }

  return {
    Roboto: roboto,
    [BRAND_CONFIG.fonts.header]: {
      normal: hasHeader ? headerPath : roboto.bold, // Use bold for headers if falling back
      bold: hasHeader ? headerPath : roboto.bold,
      italics: hasHeader ? headerPath : roboto.italics,
      bolditalics: hasHeader ? headerPath : roboto.bolditalics,
    },
    [BRAND_CONFIG.fonts.body]: {
      normal: hasBody ? bodyPath : roboto.normal,
      bold: hasBody ? bodyPath : roboto.bold,
      italics: hasBody ? bodyPath : roboto.italics,
      bolditalics: hasBody ? bodyPath : roboto.bolditalics,
    }
  };
}
