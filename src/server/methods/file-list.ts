import fs from 'fs';

export function fileList(directoryPath: string) {
  const files = fs.readdirSync(directoryPath);

  const formatted =  files.map(name => {
    const path = directoryPath + (directoryPath[directoryPath.length - 1] === '/' ? '' : '/') + name;
    let isFile = true;

    try {
      isFile = fs.statSync(path).isFile();
    } catch(e) {

    }

    return {
      name,
      path,
      isFile,
      currentFolder: false,
    }
  }).sort((a, b) => {
    if(a.isFile === b.isFile) {
      return a.name.localeCompare​(b.name);
    }

    return a.isFile ? 1 : -1;
  });

  return [{name: '...', path: directoryPath, isFile: false, currentFolder: true}, ...formatted];
}