/**
 * for generation need visit https://stamm-wilbrandt.de/GraphvizFiddle/
 * or https://stamm-wilbrandt.de/GraphvizFiddle/2.1.2/
 * 
 * 
 */
import fs from 'fs';
import path from 'path';

import Viz from 'viz.js';
import { Module, render } from 'viz.js/full.render.js';

import { FileObj } from './classes/file-obj';
import { basePath, fileList, folderForIgnore, subgraphObj } from './configs/configs';
import { addTransparent, dependsPathMapCount, getRandomColor, isTsFile, pathWithoutNotSupportSymbols, pureFileName, toNameInCamelCase } from './functions/helpers';
 
interface ISimpleMap <T>{
  [key: string]: T
}


function readFolder(directoryPath: string) {
  try {

    const files = fs.readdirSync(directoryPath);

    files.forEach(function (name) {
      if (folderForIgnore.includes(name)) return;

      const path = directoryPath + '/' + name;
      if (isThisFile(path)) {
        if (isTsFile(path)) {

          let file = fs.readFileSync(path, 'utf8').toString();

          fileList.push(new FileObj(path, file));
        }
      } else {
        readFolder(path);
      }
    });
  } catch(err) {
    console.error(err);
  }

  if (basePath === directoryPath) {
    fs.writeFileSync('./result/allFileDepend.json', JSON.stringify(fileList, null, 2), 'utf8');

    generateDigraphConfig(fileList.sort((a, b) => a.deeps - b.deeps));
  }
}

function isThisFile(path: string) {
  return fs.statSync(path).isFile();
}
 
 
 readFolder(basePath);
 
 
function generateDigraphConfig(data:FileObj[]) {
  let relations = '';
  let relationsSimple = '';
  let structure = '';
  let subgraph = '';
  const mapOfPathCounts = dependsPathMapCount(data);
  const addedToStructureMap: ISimpleMap<boolean> = {};

  data.forEach(parent => {
    if (!(parent.type === 'module' /*|| parent.type === 'component'*/)) return;

    subgraphObj.forEach(el => {
      if (parent.path.indexOf(el.path) !== -1) {
        el.listOfPath.push(parent.path)
      }
    })

    if (parent.importsModuleList.length) {
      structure += `${pathWithoutNotSupportSymbols(parent.path)} [label="${toNameInCamelCase(parent.path)} | ${structureCreator(parent.importsModuleList)}" color="${addTransparent('#000000', mapOfPathCounts[parent.path] === 1)}"];\r\n`;

      addedToStructureMap[pathWithoutNotSupportSymbols(parent.path)] = true;
    }
  });

  data.forEach(parent => {
    if (!(parent.type === 'module' /*|| parent.type === 'component'*/)) return;
    const color = getRandomColor();

    parent.depends.forEach(depend => {
      if (!(depend.type === 'module' /*|| depend.type === 'component'*/)) return;

      if (!addedToStructureMap[pathWithoutNotSupportSymbols(depend.path)]) {
        subgraphObj.forEach(el => {
          if (depend.path.indexOf(el.path) !== -1) {
            el.listOfPath.push(depend.path)
          }
        });

        structure += `${pathWithoutNotSupportSymbols(depend.path)} [label="${toNameInCamelCase(depend.path)}" color="${addTransparent('#000000', mapOfPathCounts[depend.path] === 1)}"];\r\n`;

        addedToStructureMap[pathWithoutNotSupportSymbols(depend.path)] = true;
      }

      depend.depVar.forEach(name => {
        relations += `${pathWithoutNotSupportSymbols(depend.path)} -> ${pathWithoutNotSupportSymbols(parent.path)}:${name} [color="${addTransparent(color, mapOfPathCounts[depend.path] === 1)}"];\r\n`;
      });

      relationsSimple += `"${pureFileName(depend.path)}" -> "${pureFileName(parent.path)}" [color="${addTransparent(color, mapOfPathCounts[depend.path] === 1)}"];\r\n`;

    });
  });

  subgraphObj.forEach((el, i) => {
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

  createChart(file, './result/digraphConfig.svg');
  createChart(simpleFile, './result/simpleDigraphConfig.svg');

  function structureCreator(importsModuleList: { name: string, path: string }[]) {
    return importsModuleList.map(({name}) => `<${name}> ${name}`).join('|');
  }
}
 
 
 
function createChart(config: string, file: string) {
  const renderOptions = { format:"svg" };

  let viz = new Viz({ Module, render });

  viz.renderString(config, renderOptions)
    .then((result: string) => {
      fs.writeFileSync(file, result, 'utf8');
    })
    .catch((error: any) => {
      // Create a new Viz instance (@see Caveats page for more info)
      viz = new Viz({ Module, render });

      // Possibly display the error
      console.error(error);
    });
}