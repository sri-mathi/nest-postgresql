import * as fs from 'fs';

export function deleteFile(filePath: string): void {
  fs.unlink(filePath, (err) => {
    if (err) throw err;
    console.log(`${filePath} was deleted`);
  });
}
