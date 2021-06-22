import { FileObj } from "../classes/file-obj";
import { ISimpleMap } from "../interfaces/simple-map.interface";

export function dependsPathMapCount(data: FileObj[]): ISimpleMap<number> {
  const mapOfPathCounts: ISimpleMap<number> = {};

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

export function toNameInCamelCase(path: string) {
  return camelCase(pureFileName(path));
}

export function pureFileName(path: string) {
  if (path[0] === '@') {
    return camelCase(path);
  }
  return path.replace(/.+?\/([^/]+?$)/, '$1');
}

export function pathWithoutNotSupportSymbols(path: string) {
  if (path[0] === '@') {
    return camelCase(path);
  }
  return path.replace(/\.\./g, '').replace(/\//g, '_').replace(/\-|\./g, '');
}

export function camelCase(path: string) {
  return path.replace(/[^a-zA-Z]([a-zA-Z])/g, (v, d) => d.toUpperCase());
}

export function getRandomColor() {
  const letters = '0123456789ABCDEF';
  let color = '#';

  for (var i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }

  return color;
}

export function addTransparent(color: string, isTransparent: boolean) {
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

export function randomBetween(min: number, max: number) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

export function isTsFile(path: string) {
  return /.+\.ts+$/.test(path);
}

export function getType(path: string): string {
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
    default:
      return '';
  }
}