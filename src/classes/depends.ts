import e from "express";
import { tsConfigMinPath as appTsConfigMinPath } from "../configs/configs";
import { getType } from "../functions/helpers";
import { ISimpleMap } from "../interfaces/simple-map.interface";

export class Depends {
  path: string = '';
  depVar: string[] = [];
  type: string;

   constructor(
     functionality: string,
     path: string, parentPath: string,
     private tsConfigMinPath: ISimpleMap<string> = appTsConfigMinPath,
  ) {
     this.type = getType(path);
     this.parsImportString(functionality, path, parentPath);
 
   }
 
 
 
   parsImportString(functionality: string, path: string, parentPath: string) {
     this.path = this.getFoolPath(path.trim(), parentPath);
     this.depVar = functionality.replace( '{', '').replace( '}', '').replace(/ |\r|\n|\r\n/g, '').split(',').map(el => el.trim()).filter(el => !!el);
   }
 
   getFoolPath(path: string, parentPath: string) {
     let newPath = this.findFoolPath(path, parentPath);
     for ( const key in this.tsConfigMinPath) {
       if (this.tsConfigMinPath.hasOwnProperty(key) && newPath.trim().indexOf(key) === 0 ) {
         newPath = newPath.replace(key, this.tsConfigMinPath[key]);
       }
 
     }
     return newPath;
   }
 
   findFoolPath(path: string, parentPath: string) {
     if (path[0] !== '.') {
       return path;
     }
 
     const pathArrayPath = path.split('/');
     if (pathArrayPath[0] === '.') {
       pathArrayPath.shift();
     }
 
     const parentArrayPath = parentPath.split('/');
     parentArrayPath.pop(); // delete file name
     while (pathArrayPath[0] === '..') {
       parentArrayPath.pop();
       pathArrayPath.shift();
     }
 
     const newPath = [...parentArrayPath, ...pathArrayPath].join('/');
     return newPath;
 
   }
 }