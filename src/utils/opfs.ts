import type { FileItem, FolderItem } from '../store/editorStore';

const OPFS_DIR_NAME = 'html-editor-project';

const getRootDir = async (): Promise<FileSystemDirectoryHandle> => {
  const root = await navigator.storage.getDirectory();
  return root.getDirectoryHandle(OPFS_DIR_NAME, { create: true });
};

export const saveToOPFS = async (files: FileItem[], folders: FolderItem[]): Promise<void> => {
  const root = await getRootDir();

  const metaFile = await root.getFileHandle('_meta.json', { create: true });
  const metaWriter = await metaFile.createWritable();
  await metaWriter.write(JSON.stringify({ folders, fileIds: files.map(f => f.id) }));
  await metaWriter.close();

  for (const file of files) {
    const fileHandle = await root.getFileHandle(`${file.id}.json`, { create: true });
    const writer = await fileHandle.createWritable();
    await writer.write(JSON.stringify(file));
    await writer.close();
  }

  console.log(`Saved ${files.length} files to OPFS`);
};

export const loadFromOPFS = async (): Promise<{ files: FileItem[]; folders: FolderItem[] } | null> => {
  try {
    const root = await getRootDir();
    const metaHandle = await root.getFileHandle('_meta.json');
    const metaFile = await metaHandle.getFile();
    const meta = JSON.parse(await metaFile.text()) as { folders: FolderItem[]; fileIds: string[] };

    const files: FileItem[] = [];
    for (const id of meta.fileIds) {
      try {
        const fileHandle = await root.getFileHandle(`${id}.json`);
        const file = await fileHandle.getFile();
        files.push(JSON.parse(await file.text()) as FileItem);
      } catch {
        // Skip missing files
      }
    }

    return { files, folders: meta.folders };
  } catch {
    return null;
  }
};

export const clearOPFS = async (): Promise<void> => {
  try {
    const root = await navigator.storage.getDirectory();
    await root.removeEntry(OPFS_DIR_NAME, { recursive: true });
  } catch {
    // Already empty
  }
};

export const isOPFSSupported = (): boolean =>
  typeof navigator !== 'undefined' &&
  'storage' in navigator &&
  typeof navigator.storage.getDirectory === 'function';
