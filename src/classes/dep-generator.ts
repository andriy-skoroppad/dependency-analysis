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
import { addTransparent, dependsPathMapCount, getRandomColor, isTsFile, pathWithoutNotSupportSymbols, pureFileName, toNameInCamelCase } from '../functions/helpers';
import { ISimpleMap } from '../interfaces/simple-map.interface';
import { FileObj } from "./file-obj";

// todo: add tsConfigMinPath !!!! for Depends
export class DepGenerator {
  fileList: FileObj[] = [];
  reversDepends: ISimpleMap<string[]> = {};
  filesInFolder: string[] = [];
  subgraphObj: {path: string, listOfPath: string[]}[] = [];

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
      // this.generateDigraphConfig(this.fileList.sort((a, b) => a.deeps - b.deeps));
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
            console.log('readFile:', path);
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
  
      fs.writeFileSync('./result/filesInFolder.json', JSON.stringify(filesInFolder, null, 2), 'utf8');
      fs.writeFileSync('./result/filesInFolderButHaveDeps.json', JSON.stringify(filesInFolderButHaveDeps, null, 2), 'utf8');
      fs.writeFileSync('./result/filesOutOfFolderNeedToCheck.json', JSON.stringify(filesOutOfFolderNeedToCheck, null, 2), 'utf8');
      fs.writeFileSync('./result/filesRelatedNotInFolder.json', JSON.stringify(filesRelatedNotInFolder, null, 2), 'utf8');
      this.saveToFile(this.generateChartConfig(filesOutOfFolderNeedToCheckForChart, this.getModuleFolder()), './result/needForCheck.svg');;
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

  generateFileWithProjectDeps() {
    this.generateDigraphConfig(this.fileList.sort((a, b) => a.deeps - b.deeps));
  }

  generateDigraphConfig(data:FileObj[]) {
    let relations = '';
    let relationsSimple = '';
    let structure = '';
    let subgraph = '';
    const mapOfPathCounts = dependsPathMapCount(data);
    const addedToStructureMap: ISimpleMap<boolean> = {};
  
    data.forEach(parent => {
      if (!(parent.type === 'module' /*|| parent.type === 'component'*/)) return;
  
      this.subgraphObj.forEach(el => {
        if (parent.path.indexOf(el.path) !== -1) {
          el.listOfPath.push(parent.path)
        }
      })
  
      if (parent.importsModuleList.length) {
        structure += `${pathWithoutNotSupportSymbols(parent.path)} [label="${toNameInCamelCase(parent.path)} | ${structureCreator(parent.importsModuleList)}" color="${addTransparent('#000000', false && mapOfPathCounts[parent.path] === 1)}"];\r\n`;
  
        addedToStructureMap[pathWithoutNotSupportSymbols(parent.path)] = true;
      }
    });
  
    data.forEach(parent => {
      if (!(parent.type === 'module' /*|| parent.type === 'component'*/)) return;
      const color = getRandomColor();
  
      parent.depends.forEach(depend => {
        if (!(depend.type === 'module' /*|| depend.type === 'component'*/)) return;
  
        if (!addedToStructureMap[pathWithoutNotSupportSymbols(depend.path)]) {
          this.subgraphObj.forEach(el => {
            if (depend.path.indexOf(el.path) !== -1) {
              el.listOfPath.push(depend.path)
            }
          });
  
          structure += `${pathWithoutNotSupportSymbols(depend.path)} [label="${toNameInCamelCase(depend.path)}" color="${addTransparent('#000000', false && mapOfPathCounts[depend.path] === 1)}"];\r\n`;
  
          addedToStructureMap[pathWithoutNotSupportSymbols(depend.path)] = true;
        }
  
        depend.depVar.forEach(name => {
          relations += `${pathWithoutNotSupportSymbols(depend.path)} -> ${pathWithoutNotSupportSymbols(parent.path)}:${name} [color="${addTransparent(color, false && mapOfPathCounts[depend.path] === 1)}"];\r\n`;
        });
  
        relationsSimple += `"${pureFileName(depend.path)}" -> "${pureFileName(parent.path)}" [color="${addTransparent(color, false && mapOfPathCounts[depend.path] === 1)}"];\r\n`;
  
      });
    });
  
    this.subgraphObj.forEach((el, i) => {
      if (el.listOfPath.length === 0) return;
  
      const elements = el.listOfPath.map(path => pathWithoutNotSupportSymbols(path)).join(' ');
      const text = `subgraph cluster_${i} {
          style=filled;
          color=lightgrey;
          node [style=filled,color=white];
          ${elements}${elements.length ? ';': ''}
          label = "${pathWithoutNotSupportSymbols(el.path)}";
        }
        
        `;
  
        subgraph += text;
    })
  
    const file =  `digraph mygraph {
      //size="6,6";
      rankdir=LR
      node [shape=record];
      ${structure}
  
      ${subgraph}
  
      ${relations}
    }`;
  
    const simpleFile =  `digraph mygraph {
  
      ${relationsSimple}
    }`;
  
    fs.writeFileSync('./result/pureData.json', JSON.stringify(data, null, 2), 'utf8');
    fs.writeFileSync('./result/addedToStructureMap.json', JSON.stringify(addedToStructureMap, null, 2), 'utf8');
    fs.writeFileSync('./result/mapOfPathCounts.json', JSON.stringify(mapOfPathCounts, null, 2), 'utf8');
    
    fs.writeFileSync('./result/digraphConfig.txt', file, 'utf8');
    fs.writeFileSync('./result/simpleDigraphConfig.txt', simpleFile, 'utf8');
  
    this.saveToFile(file, './result/digraphConfig.svg');
    this.saveToFile(simpleFile, './result/simpleDigraphConfig.svg');
  
    function structureCreator(importsModuleList: { name: string, path: string }[]) {
      return importsModuleList.map(({name}) => `<${name}> ${name}`).join('|');
    }
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
      ${filesInFolder.map(path => pathWithoutNotSupportSymbols(path)).join(' ')}${filesInFolder.length ? ';' : ''}
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
    fs.writeFileSync('./result/svgGrafConfig.txt', config, 'utf8');
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