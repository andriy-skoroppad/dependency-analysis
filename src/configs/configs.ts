import { FileObj } from "../classes/file-obj";
import { ISimpleMap } from "../interfaces/simple-map.interface";

export let fileList: FileObj[] = [];
export const appPath = '../../my_wagez';
// for search all related imports for this module
export const baseModule =  '';

export const basePath = appPath + '';

export const folderForIgnore = [
  'node_modules',
  '.vscode',
  'dist',
  '.idea',
  '.idea',
  '.git'
];

export const tsConfigMinPath: ISimpleMap<string> = {
  "@environment": appPath + "/core/environments/environment",
  "exceljs": appPath + "/node_modules/exceljs/dist/exceljs.min",
  // "core/information/information.module": appPath + "/core/information/information.module",
};

export const subgraphObj: {path: string, listOfPath: string[]}[] = [
  {
    path: appPath + '/core/',
    listOfPath: []
  },
];