import fs from 'fs';

import Viz from 'viz.js';
import { Module, render } from 'viz.js/full.render.js';
import { 
  basePath as basePathFromConfig,
  baseModule as baseModuleFromConfig,
  appPath as appPathFromConfig,
  folderForIgnore as folderForIgnoreFromConfig,
  tsConfigMinPath as appTsConfigMinPath
} from "../configs/configs";
import { isTsFile, pathWithoutNotSupportSymbols, pureFileName, toNameInCamelCase } from '../functions/helpers';
import { ISimpleMap } from '../interfaces/simple-map.interface';
import { FileObj } from "./file-obj";

// todo: add tsConfigMinPath !!!! for Depends
export class DepGenerator {
  fileList: FileObj[] = [];
  reversDepends: ISimpleMap<string[]> = {};
  filesInFolder: string[] = [];

  constructor(
    private folderForIgnore: string[] = folderForIgnoreFromConfig,
    private basePath: string = basePathFromConfig,
    private baseModule: string = baseModuleFromConfig,
    private appPath: string = appPathFromConfig,
    private tsConfigMinPath: ISimpleMap<string> = appTsConfigMinPath,
    ) {}

  start() {
    this.readFolder(this.basePath, () => {
      fs.writeFileSync('./result/allFileDepend.json', JSON.stringify(this.fileList, null, 2), 'utf8');
      this.prepareListOfOtOfFolderFiles();
      // generateDigraphConfig(fileList.sort((a, b) => a.deeps - b.deeps));
    });
  }

  readFolder(directoryPath: string, callback: () => void) {
    try {
  
      const files = fs.readdirSync(directoryPath);
  
      files.forEach((name) => {
        if (this.folderForIgnore.includes(name)) return;
  
        const path = directoryPath + '/' + name;
        if (this.isThisFile(path)) {
          if (isTsFile(path)) {
  
            let file = fs.readFileSync(path, 'utf8').toString();
  
            this.fileList.push(new FileObj(path, file, this.tsConfigMinPath));
          }
        } else {
          this.readFolder(path, callback);
        }
      });
    } catch(err) {
      console.error(err);
    }
  
    if (this.basePath === directoryPath) {
      callback();
    }
  }
  
  isThisFile(path: string) {
    return fs.statSync(path).isFile();
  }

  getModuleFolder() {
    return this.baseModule.replace(/\/[^/]+?$/g, '');
  }

  prepareListOfOtOfFolderFiles() {
    // console.log(this.baseModule)
    const mapOfFiles: ISimpleMap<FileObj> = {};
    const moduleFolder = this.getModuleFolder();
    const reversDepends: ISimpleMap<string[]> = {};
  
    this.fileList.forEach(file => {
      mapOfFiles[file.path] = file;
  
      file.depends.forEach(dep => {
        if (reversDepends[dep.path]) {
          reversDepends[dep.path].push(file.path);
        } else {
          reversDepends[dep.path] = [file.path];
        }
      });
    });

    this.reversDepends = {...reversDepends};
  
    const module = mapOfFiles[this.baseModule];
  
    if (module) {
      const filesInFolder: string[] = [];
      const filesInFolderButHaveDeps: ISimpleMap<string[]>[] = []; // todo: make object
      const filesRelatedNotInFolder: string[] = [];
      const filesOutOfFolderNeedToCheck: ISimpleMap<string[]>[] = [];
      const filesOutOfFolderNeedToCheckForChart: ISimpleMap<string[]>[] = [];
  
      for (let path in reversDepends) {
        if (path.includes(moduleFolder)) {
          let isExistRelationsOutOfModule = false;
  
          reversDepends[path].forEach(relPath => {
            if (!isExistRelationsOutOfModule && !relPath.includes(moduleFolder)) {
              isExistRelationsOutOfModule = true;
            }
          });
  
          filesInFolder.push(path);
  
          if (isExistRelationsOutOfModule) {
            filesInFolderButHaveDeps.push(this.prepareObj(path, reversDepends));
          }
  
        } else {
          let isExistRelationsToModule = false;
          let isAllRelationsToModule = true;
  
          reversDepends[path].forEach(relPath => {
            if (!isExistRelationsToModule && relPath.includes(moduleFolder)) {
              isExistRelationsToModule = true;
            }
  
            if (isAllRelationsToModule && !relPath.includes(moduleFolder)) {
              isAllRelationsToModule = false;
            }
          });
  
          if (isExistRelationsToModule && path.includes(this.appPath)) {
            filesOutOfFolderNeedToCheck.push(this.prepareObj(path, reversDepends));

            if (path.includes(this.appPath)) {
              filesOutOfFolderNeedToCheckForChart.push(this.prepareObj(path, reversDepends));
            }
          }
  
          if (isAllRelationsToModule) {
            filesRelatedNotInFolder.push(path);
          }
        }
      }

      this.filesInFolder = [...filesInFolder];
  
      fs.writeFileSync('./result/test/filesInFolder.json', JSON.stringify(filesInFolder, null, 2), 'utf8');
      fs.writeFileSync('./result/test/filesInFolderButHaveDeps.json', JSON.stringify(filesInFolderButHaveDeps, null, 2), 'utf8');
      fs.writeFileSync('./result/test/filesOutOfFolderNeedToCheck.json', JSON.stringify(filesOutOfFolderNeedToCheck, null, 2), 'utf8');
      fs.writeFileSync('./result/test/filesRelatedNotInFolder.json', JSON.stringify(filesRelatedNotInFolder, null, 2), 'utf8');
      this.saveToFile(this.generateChartConfig(filesOutOfFolderNeedToCheckForChart, this.getModuleFolder()), './result/test/needForCheck.svg');;
    } else {
      throw Error(`File not exist : (${this.baseModule})`);
    }
  }

  prepareObj(path: string, reversDepends: ISimpleMap<string[]>): ISimpleMap<string[]> {
    return {[path]: path.includes(this.appPath) ? reversDepends[path] || [] : [`not show... ${(reversDepends[path] || []).length} items`]}
  }

  getDepForFile(path: string, depLevel = 10) {

    
    // todo: test this !!!!
    const getAllPath = (p: string, d: number):string[] => {
      if (d && this.reversDepends[p]) {
        const all: string[] = this.reversDepends[p];
        return all.reduce((acum: string[], el: string) => {
          return [...acum, el, ...getAllPath(el, d - 1)];
        }, []);
      } else {
        return this.reversDepends[p] || [];
      }
    }

    const depList: ISimpleMap<string[]>[] = [path, ...new Set(getAllPath(path, depLevel))].map(path => ({[path]: this.reversDepends[path] || []}));

    return depList;

  }

  getSVGDepForFile(path: string, depLevel = 10) {
    const dep = this.getDepForFile(path, depLevel);
    const config = this.generateChartConfig(dep, path);
    return this.getSvgChart(config);
  }

  generateChartConfig(data: ISimpleMap<string[]>[], startPath = this.getModuleFolder()) {
    const moduleFolder = this.getModuleFolder();

    const fileIn: string[] = []

    let relationsSimple = '';
    data.forEach(el => {
      Object.keys(el).forEach(mainPath => {
        fileIn.push(mainPath);

        el[mainPath].forEach(relPath => {
          fileIn.push(relPath);

          relationsSimple += `"${pathWithoutNotSupportSymbols(relPath)}" -> "${pathWithoutNotSupportSymbols(mainPath)}";\r\n`;
        })

      })

    });

    const structure = [... new Set(fileIn)].map(path => `${pathWithoutNotSupportSymbols(path)} [label="${toNameInCamelCase(path)}" color=${path === startPath ? 'deepskyblue': 'black'}];\r\n`).join('');
    const filesInFolder: string[] = [... new Set(fileIn)].filter(path => path.includes(moduleFolder));
    const subgraph =  `subgraph cluster_1 {
      style=filled;
      color=lightgrey;
      node [style=filled,color=white];
      ${filesInFolder.map(path => pathWithoutNotSupportSymbols(path)).join(' ')};
      label = "${toNameInCamelCase(this.baseModule)}";
    }
    
    `;

    return `digraph mygraph {


      ${structure}
      ${subgraph}
      ${relationsSimple}
    }`;
  }

  saveToFile(config: string, file: string) {
    this.getSvgChart(config)
      .then((svg: string) => {
        fs.writeFileSync(file, svg, 'utf8');
      })
      .catch((error: any) => {
        console.error(error);
      });
  }

  getSvgChart(config: string): Promise<string> {
    return new Promise(resolve => {
      const renderOptions = { format:"svg" };
  
      let viz = new Viz({ Module, render });
    
      viz.renderString(config, renderOptions)
        .then((result: string) => {
          resolve(result);
        })
        .catch((error: any) => {
          // Create a new Viz instance (@see Caveats page for more info)
          viz = new Viz({ Module, render });
    
          // Possibly display the error
          console.error(error);
        });
    })
    
  }
 }