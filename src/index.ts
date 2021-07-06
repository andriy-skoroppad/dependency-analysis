import child_process from "child_process";
import express from "express";
import cors from "cors";
import fs from 'fs';

import { DepGenerator } from "./classes/dep-generator";
import { appPath, baseModule, basePath, folderForIgnore, tsConfigMinPath } from "./configs/configs";
import { consoleInterceptor } from "./server/interceptor/console.interceptor";
import { fileList } from "./server/methods/file-list";
import { ISimpleMap } from "./interfaces/simple-map.interface";

// const generator = new DepGenerator(config.folderForIgnore, config.basePath, config.baseModule, config.appPath, config.tsConfigMinPath);

// generator.start();
let prevSessionConfig = null;

try {
  prevSessionConfig = JSON.parse(fs.readFileSync(`./session/prevSessionConfig.json`, 'utf8').toString())

} catch(e) {

}


const config: {
  folderForIgnore: string[];
  basePath: string;
  baseModule: string;
  appPath: string;
  tsConfigMinPath: ISimpleMap<string>;
} = {
  folderForIgnore: prevSessionConfig ? prevSessionConfig.folderForIgnore : [...folderForIgnore],
  basePath: prevSessionConfig ? prevSessionConfig.basePath : basePath,
  baseModule: prevSessionConfig ? prevSessionConfig.baseModule : baseModule,
  appPath: prevSessionConfig ? prevSessionConfig.appPath : appPath,
  tsConfigMinPath: prevSessionConfig ? prevSessionConfig.tsConfigMinPath : tsConfigMinPath || {}
}

let depGenerator: DepGenerator;


const app = express();

if (config.appPath) {
  updateTsConfigMinPath(config.appPath);
}

app.use(cors());
app.use(express.json({limit: '50mb'}));
app.use(express.urlencoded({limit: '50mb', extended: true}));

app.use(consoleInterceptor);
app.use(express.static('./www', { extensions: ['html'] }));

// // ----- pages -----
// app.get('/', (request, res) => res.send(indexPage()));
// app.get('/fs', (request, res) => res.send(filePage()));
// app.get('/result', (request, res) => res.send(dependsPage()));


// ----- api ------
app.get('/api/get-config', async (request, res) => {
  try {
    res.status(200).send(config);
    } catch (e) {
    res.status(400).send({message: "", errorKey: "BAD.REQUEST", errorDescription: JSON.stringify(e)});
  }
});

app.get('/api/get-folder-content', async (request, res) => {
  try {
    let folder = typeof request.query.folder === 'string' ? decodeURIComponent(request.query.folder) : (config.appPath || './');
    console.log(folder)
    res.status(200).send(fileList(folder));
    } catch (e) {
      res.status(400).send({message: "", errorKey: "BAD.REQUEST", errorDescription: JSON.stringify(e)});
  }
});
app.get('/api/checked', async (request, res) => {
  try {
    let allChecked: ISimpleMap<string[]> = {};
    const modulePath = config.baseModule;
    try {
      allChecked = JSON.parse(fs.readFileSync(`./session/checked.json`, 'utf8').toString())
    } catch(e) {

    }

    res.status(200).send(allChecked[modulePath] || []);
    } catch (e) {
    res.status(400).send({message: "", errorKey: "BAD.REQUEST", errorDescription: JSON.stringify(e)});
  }
});

app.post('/api/checked', async (request, res) => {
  try {
    const modulePath = config.baseModule;
    const path = request.body.path;

    let allChecked: ISimpleMap<string[]> = {};

    try {
      allChecked = JSON.parse(fs.readFileSync(`./session/checked.json`, 'utf8').toString())
    } catch(e) {

    }

    if (allChecked[modulePath]) {
      const index = allChecked[modulePath].indexOf(path);
      if (index === -1) {
        allChecked[modulePath].push(path);
      }
    } else {
      allChecked[modulePath] = [path];
    }

    fs.writeFileSync('./session/checked.json', JSON.stringify(allChecked, null, 2), 'utf8');

    res.status(200).send(allChecked[modulePath]);
    } catch (e) {
    res.status(400).send({message: "", errorKey: "BAD.REQUEST", errorDescription: JSON.stringify(e)});
  }
});

app.delete('/api/checked/:path', async (request, res) => {
  try {
    const modulePath = config.baseModule;
    const path = decodeURIComponent(request.params.path)

    let allChecked: ISimpleMap<string[]> = {};

    try {
      allChecked = JSON.parse(fs.readFileSync(`./session/checked.json`, 'utf8').toString())
    } catch(e) {

    }

    if (allChecked[modulePath]) {
      const index = allChecked[modulePath].indexOf(path);

      index > -1 && allChecked[modulePath].splice(index, 1);
    } else {
      allChecked[modulePath] = [];
    }

    fs.writeFileSync('./session/checked.json', JSON.stringify(allChecked, null, 2), 'utf8');

    res.status(200).send(allChecked[modulePath]);
    } catch (e) {
    res.status(400).send({message: "", errorKey: "BAD.REQUEST", errorDescription: JSON.stringify(e)});
  }
});

app.delete('/api/delete-folder-for-ignore/:type', async (request, res) => {
  try {
    const value = decodeURIComponent(request.params.type)
    const index = config.folderForIgnore.indexOf(value);

    index > -1 && config.folderForIgnore.splice(index, 1);

    res.status(200).send(config.folderForIgnore);
    } catch (e) {
    res.status(400).send({message: "", errorKey: "BAD.REQUEST", errorDescription: JSON.stringify(e)});
  }
});

app.put('/api/select/:type', async (request, res) => {
  try {
    // type: folderForIgnore, basePath, baseModule, appPath
    const type = decodeURIComponent(request.params.type)
    const path = request.body.path;

    console.log(type, request.body )

    switch (type) {
      case 'folderForIgnore':
        config.folderForIgnore.push(path)
        break;
      case 'basePath':
        config.basePath = path;
        break;
      case 'baseModule':
        if (fs.statSync(path).isFile()) {
          config.baseModule = path.replace(/\.ts$/, '');
        }
        break;
      case 'appPath':
        config.appPath = path;

        if (!config.basePath) {
          config.basePath = path;
        }
        break;
    }

    if (config.appPath) {
      updateTsConfigMinPath(config.appPath);
    }

    // save prev config!!!
    fs.writeFileSync('./session/prevSessionConfig.json', JSON.stringify(config, null, 2), 'utf8');

    res.status(200).send({});
    } catch (e) {
    res.status(400).send({message: "", errorKey: "BAD.REQUEST", errorDescription: JSON.stringify(e)});
  }
});

app.get('/api/analyze-module', async (request, res) => {
  try {
    if (config.basePath && config.baseModule && config.appPath) {
      console.log(config.tsConfigMinPath);
      depGenerator = new DepGenerator(config.folderForIgnore, config.basePath, config.baseModule, config.appPath, config.tsConfigMinPath);

      depGenerator.start();
    }
    

    res.status(200).send({});
    } catch (e) {
    res.status(400).send({message: "", errorKey: "BAD.REQUEST", errorDescription: JSON.stringify(e)});
  }
});

app.get('/api/analyze-result', async (request, res) => {
  try {

    const body = {
      filesInFolderButHaveDeps: JSON.parse(fs.readFileSync(`./result/filesInFolderButHaveDeps.json`, 'utf8').toString()),
      filesOutOfFolderNeedToCheck: JSON.parse(fs.readFileSync(`./result/filesOutOfFolderNeedToCheck.json`, 'utf8').toString()),
      filesRelatedNotInFolder: JSON.parse(fs.readFileSync(`./result/filesRelatedNotInFolder.json`, 'utf8').toString()),
    };

    res.status(200).send(body);
    } catch (e) {
    res.status(400).send({message: "", errorKey: "BAD.REQUEST", errorDescription: JSON.stringify(e)});
  }
});

app.get('/api/get-file', async (request, res) => {
  try {
    const file = typeof request.query.file === 'string' ? decodeURIComponent(request.query.file) : '';

    const body = {
      file: '',
    };

    if (file) {
      try {
        body.file = fs.readFileSync(file, 'utf8').toString();
      } catch(e) {
        console.log(file + ', file not exist');
      }
    }

    res.status(200).send(body);

    } catch (e) {
    res.status(400).send({message: "", errorKey: "BAD.REQUEST", errorDescription: JSON.stringify(e)});
  }
});

app.get('/api/get-file-deps', async (request, res) => {
  try {
    const file = typeof request.query.file === 'string' ? decodeURIComponent(request.query.file) : '';
    const depLevel = typeof request.query.depLevel === 'string' ? decodeURIComponent(request.query.depLevel) : '';

    const body: {svg: string} = {
      svg: '',
    };

    if (file) {
       depGenerator.getSVGDepForFile(file, +depLevel || 5).then(svg => {
        body.svg = svg;

        res.status(200).send(body);
      });
    }

    } catch (e) {
      console.log(e);
    res.status(400).send({message: "", errorKey: "BAD.REQUEST", errorDescription: JSON.stringify(e)});
  }
});

app.get('/api/generate-file-with-project-deps', async (request, res) => {
  try {
    depGenerator.generateFileWithProjectDeps();
    res.status(200).send({});
    } catch (e) {
      console.log(e);
      res.status(400).send({message: "", errorKey: "BAD.REQUEST", errorDescription: JSON.stringify(e)});
  }
});

 // -------- start server and open browser --------
app.listen( 9010, function () {
  const url = 'http://localhost:9010';
  const start = (process.platform == 'darwin'? 'open': process.platform == 'win32'? 'start': 'xdg-open');
  child_process.exec(start + ' ' + url);

  console.log(`Listening on port ${9010}`);
});

// todo: fix all paths

// tsconfig file !!!!!

// todo: scan all folder and add to config

function updateTsConfigMinPath(appPath: string) {
  try {
    let tsconfig = fs.readFileSync(`${appPath}/tsconfig.json`, 'utf8').toString();

    const folders = fs.readdirSync(appPath).filter(element => fs.statSync(`${appPath}/${element}`).isDirectory());
    
    tsconfig = tsconfig.replace(/\/\/.+/g, '').replace(/\t| |\r\n|\r|\n/g, '').replace(/\,\}/g, '}');
    const tsconfigObj = JSON.parse(tsconfig);
    config.tsConfigMinPath = {};
    folders.forEach(folder => {
      config.tsConfigMinPath[folder] = `${appPath}/${folder}`;
    });
    // todo: fix issue with multiple
    if (tsconfigObj.compilerOptions && tsconfigObj.compilerOptions.paths) {
      for (let key in tsconfigObj.compilerOptions.paths) {
        config.tsConfigMinPath[key.replace(/\/\*?$/g, '/')] = appPath + '/' + tsconfigObj.compilerOptions.paths[key][0].replace(/\*$/g, '');
      }
    }
  } catch(e) {
    console.error(e);
  }
}

