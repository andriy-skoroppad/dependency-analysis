import { getType } from "../functions/helpers";
import { ISimpleMap } from "../interfaces/simple-map.interface";
import { Depends } from "./depends";
import { tsConfigMinPath as appTsConfigMinPath } from "../configs/configs";

export class FileObj {
  path: string;
  depends: Depends[] = [];
  importsModuleList: {name: string, path: string}[] = [];
  type: string;
  deeps: number;

   constructor (path: string, file: string, private tsConfigMinPath: ISimpleMap<string> = appTsConfigMinPath,) {
     
     this.path = path.replace(/\.ts$/, '');
     this.depends = [];
     this.importsModuleList = [];
     this.type = getType(path);
     this.deeps = this.path.replace(/[^/]/g, '').length;
 
 
     this.parsFile(file, path);
 
     this.setImportsModuleList(file, this.depends);
   }
 
   setImportsModuleList(file: string, depVar: Depends[]) {
 
     let importsString = '';
     file.replace(/imports: *?\[((?:.|(?:\r\n))+?)\](?!\))/, (searchValue, p1) => {
       importsString = p1;
 
       return searchValue;
     });
 
     if (!importsString.length) {
       return;
     }
 
 
     importsString = importsString.replace(/\..+?\(((?:.|(?:\r\n))+?)\)/g, '');
 
     const arrayWithModules = importsString.replace(/ |(?:\r\n)|\..+?\((?:.|(?:\r\n|\r|\n))+?\)/g, '').trim().replace(/,$/, '').split(',');
 
     const mapOfName = depVar.reduce((acum: ISimpleMap<string>, dep: Depends) => {
       dep.depVar.forEach((val: string) => acum[val] = dep.path);
       return acum;
     }, {});
 
     this.importsModuleList = arrayWithModules.map(moduleName => {
       return {
         name: moduleName,
         path: mapOfName[moduleName]
       };
     });
 
   }
 
   parsFile(file: string, path: string) {
     file.replace(/\`/gm, '\'').replace(/import((?:.|(?:\r\n))+?)from ?'(.+?)'/gm, (searchValue, p1, p2) => {
       this.depends.push(new Depends(p1, p2, path, this.tsConfigMinPath));
 
       return searchValue;
     }).replace(/loadChildren:.*?import\('(.+?)'\).+?(?:(?:=>)|(?:\{return)).+?\.(.+?)(?:\)|})/gm, (searchValue, p1, p2) => {
       this.depends.push(new Depends(p2, p1, path, this.tsConfigMinPath));
       console.log(p2, p1);
 
       return searchValue;
     });
   }
 }