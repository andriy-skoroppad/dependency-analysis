/**
 * for generation need visit https://stamm-wilbrandt.de/GraphvizFiddle/
 * or https://stamm-wilbrandt.de/GraphvizFiddle/2.1.2/
 * 
 * 
 */
const fs = require('fs');
const path = require('path');

const Viz = require('viz.js');
const { Module, render } = require('viz.js/full.render.js');

let fileList = [];
const basePath = '../my_wagez/projects';
const folderForIgnore = [
  'node_modules',
  '.vscode',
  'dist',
  '.idea',
  '.idea',
  '.git'
];

const tsConfigMinPath = {
  "@environment": "../my_wagez/core/environments/environment",
  "@administration-app/": "../my_wagez/projects/administration/",
  "@hr-app/": "../my_wagez/projects/hr/",
  "@employee-app/": "../my_wagez/projects/employee/",
  "@terms-and-conditions-app/": "../my_wagez/projects/terms-and-conditions/",
  "@root/": "../my_wagez/core/",
  "@root-api/": "../my_wagez/core/api/",
  "@root-informational/": "../my_wagez/core/information/",
  "@root-main/": "../my_wagez/core/main/",
  "@root-material/": "../my_wagez/core/material/",
  "@root-mocked-api/": "../my_wagez/core/mocked-api/",
  "@root-shared/": "../my_wagez/core/shared/",
  "@root-store/": "../my_wagez/core/store/",
  "exceljs": "../my_wagez/node_modules/exceljs/dist/exceljs.min",
  // "core/information/information.module": "../my_wagez/core/information/information.module",
};

const subgraphObj = [
  {
    path: '../my_wagez/core/',
    listOfPath: []
  },
  {
    path: '../my_wagez/projects/hr/',
    listOfPath: []
  },
  {
    path: '../my_wagez/projects/employee/',
    listOfPath: []
  },
  {
    path: '../my_wagez/projects/administration/',
    listOfPath: []
  }
];



function readFolder(directoryPath) {
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









function isTsFile(path) {
  return /.+\.ts+$/.test(path);
}


class FileObj {
  constructor (path, file) {
    
    this.path = path.replace(/\.ts$/, '');
    this.depends = [];
    this.importsModuleList = [];
    this.type = getType(path);
    this.deeps = this.path.replace(/[^/]/g, '').length;


    this.parsFile(file, path);

    this.setImportsModuleList(file, this.depends);
  }

  setImportsModuleList(file, depVar) {

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

    const mapOfName = depVar.reduce((acum, dep) => {
      dep.depVar.forEach(val => acum[val] = dep.path);
      return acum;
    }, {});

    this.importsModuleList = arrayWithModules.map(moduleName => {
      return {
        name: moduleName,
        path: mapOfName[moduleName]
      };
    });

  }

  parsFile(file, path) {
    file.replace(/\`/gm, '\'').replace(/import((?:.|(?:\r\n))+?)from ?'(.+?)'/gm, (searchValue, p1, p2) => {
      this.depends.push(new Depends(p1, p2, path));

      return searchValue;
    }).replace(/loadChildren:.*?import\('(.+?)'\).+?(?:(?:=>)|(?:\{return)).+?\.(.+?)(?:\)|})/gm, (searchValue, p1, p2) => {
      this.depends.push(new Depends(p2, p1, path));
      console.log(p2, p1);

      return searchValue;
    });
  }
}
function getType(path) {
  switch (true) {
    case /.+\.service(?:\.ts)?$/.test(path): {
      return 'service';
    }
    case /.+\.module(?:\.ts)?$/.test(path): {
      return 'module';
    }
    // case /^\@.+/.test(path): {
    //   return 'module';
    // }
    case /.+\.component(?:\.ts)?$/.test(path): {
      return 'component';
    }
    case /.+\.guard(?:\.ts)?$/.test(path): {
      return 'guard';
    }
    case /.+\.resolver(?:\.ts)?$/.test(path): {
      return 'resolver';
    }
  }
}

class Depends {
  constructor(functionality, path, parentPath) {
    this.path = '';
    this.depVar = [];
    this.type = getType(path);
    this.parsImportString(functionality, path, parentPath);

  }



  parsImportString(functionality, path, parentPath) {
    this.path = this.getFoolPath(path.trim(), parentPath);
    this.depVar = functionality.replace( '{', '').replace( '}', '').replace(/ |\r|\n|\r\n/g, '').split(',');
  }

  getFoolPath(path, parentPath) {
    let newPath = this.findFoolPath(path, parentPath);
    for ( const key in tsConfigMinPath) {
      if (tsConfigMinPath.hasOwnProperty(key)) {
        newPath = newPath.replace(key, tsConfigMinPath[key]);
      }

    }
    return newPath;
  }

  findFoolPath(path, parentPath) {
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

function isThisFile(path) {
  return fs.statSync(path).isFile();
}


readFolder(basePath);


function generateDigraphConfig(data) {
  let relations = '';
  let relationsSimple = '';
  let structure = '';
  let subgraph = '';
  const mapOfPathCounts = dependsPathMapCount(data);
  const addedToStructureMap = {};

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


  // for future add
  // subgraph cluster_0 {
  //   style=filled;
  //   color=lightgrey;
  //   node [style=filled,color=white];
  //   a0 a1  a2  a3;
  //   label = "process #1";
  // }

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
        ${elements};
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

  function structureCreator(importsModuleList) {
    return importsModuleList.map(({name}) => `<${name}> ${name}`).join('|');
  }
}

function dependsPathMapCount(data) {
  const mapOfPathCounts = {};

  data.forEach(parent => {
    parent.depends.forEach(depend => {
      if (!mapOfPathCounts[depend.path]) {
        mapOfPathCounts[depend.path] = 0;
      }
      if (!mapOfPathCounts[toNameInCamelCase(depend.path)]) {
        mapOfPathCounts[toNameInCamelCase(depend.path)] = 0;
      }

      mapOfPathCounts[toNameInCamelCase(depend.path)] += 1;
      mapOfPathCounts[depend.path] += 1;
    })
  })

  return mapOfPathCounts;
}

function toNameInCamelCase(path) {
  return camelCase(pureFileName(path));
}

function pureFileName(path) {
  if (path[0] === '@') {
    return camelCase(path);
  }
  return path.replace(/.+?\/([^/]+?$)/, '$1');
}

function pathWithoutNotSupportSymbols(path) {
  if (path[0] === '@') {
    return camelCase(path);
  }
  return path.replace(/\.\./g, '').replace(/\//g, '_').replace(/\-|\./g, '');
}

function camelCase(path) {
  return path.replace(/[^a-zA-Z]([a-zA-Z])/g, (v, d) => d.toUpperCase());
}

function getRandomColor() {
  const letters = '0123456789ABCDEF';
  let color = '#';

  for (var i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }

  return color;
}

function addTransparent(color, isTransparent) {
  const alfa = isTransparent ? '20' : '';
return color + alfa;
}

// function getRandomColor(isTransparent = false) {
//   const r = randomBetween(0, 255);
//   const g = randomBetween(0, 255);
//   const b = randomBetween(0, 255);
//   const alfa = isTransparent ? 0.3 : 1;

//   return `rgba(${r},${g},${b}, ${alfa})`;
// }

function randomBetween(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function createChart(config, file) {
  const renderOptions = { format:"svg" };

  let viz = new Viz({ Module, render });

  viz.renderString(config, renderOptions)
    .then(result => {
      fs.writeFileSync(file, result, 'utf8');
    })
    .catch(error => {
      // Create a new Viz instance (@see Caveats page for more info)
      viz = new Viz({ Module, render });

      // Possibly display the error
      console.error(error);
    });
}