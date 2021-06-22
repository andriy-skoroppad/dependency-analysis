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

const config: {
  folderForIgnore: string[];
  basePath: string;
  baseModule: string;
  appPath: string;
  tsConfigMinPath: ISimpleMap<string>;
} = {
  folderForIgnore: [...folderForIgnore],
  basePath: '' || basePath,
  baseModule: '' || baseModule,
  appPath: '' || appPath,
  tsConfigMinPath: tsConfigMinPath || {}
}

let depGenerator: DepGenerator;


const app = express();

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

        updateTsConfigMinPath(config.appPath)
        break;
    }

    res.status(200).send({});
    } catch (e) {
    res.status(400).send({message: "", errorKey: "BAD.REQUEST", errorDescription: JSON.stringify(e)});
  }
});

app.get('/api/analyze-module', async (request, res) => {
  try {
    if (config.basePath && config.baseModule && config.appPath) {
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
      filesInFolderButHaveDeps: JSON.parse(fs.readFileSync(`./result/test/filesInFolderButHaveDeps.json`, 'utf8').toString()),
      filesOutOfFolderNeedToCheck: JSON.parse(fs.readFileSync(`./result/test/filesOutOfFolderNeedToCheck.json`, 'utf8').toString()),
      filesRelatedNotInFolder: JSON.parse(fs.readFileSync(`./result/test/filesRelatedNotInFolder.json`, 'utf8').toString()),
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

    const body = {
      svg: null,
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

 // -------- start server and open browser --------
app.listen( 9010, function () {
  const url = 'http://localhost:9010';
  const start = (process.platform == 'darwin'? 'open': process.platform == 'win32'? 'start': 'xdg-open');
  child_process.exec(start + ' ' + url);

  console.log(`Listening on port ${9010}`);
});

// todo: fix all paths

// tsconfig file !!!!!

function updateTsConfigMinPath(appPath: string) {
  try {
    let tsconfig = fs.readFileSync(`${appPath}/tsconfig.json`, 'utf8').toString();
    tsconfig = tsconfig.replace(/\/\/.+/g, '');
    const tsconfigObj = JSON.parse(tsconfig);
    // todo: fix issue with multiple
    if (tsconfigObj.compilerOptions && tsconfigObj.compilerOptions.paths) {
      for (let key in tsconfigObj.compilerOptions.paths) {
        config.tsConfigMinPath[key.replace(/\/\*?$/g, '/')] = appPath + '/' + tsconfigObj.compilerOptions.paths[key][0].replace(/\*$/g, '');
      }
    }
  } catch(e) {

  }
}