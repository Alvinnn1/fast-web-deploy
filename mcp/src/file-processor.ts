import fs from 'fs-extra';
import path from 'path';
import mime from 'mime-types';
import { FileInfo } from './types.js';
import { blake3 } from 'hash-wasm'

const IGNORE_PATTERNS = [
  '_worker.js',
  '_routes.json',
  'functions',
  '.DS_Store',
  'node_modules',
  '.git',
  'Thumbs.db',
  '.vscode',
  '.idea'
];

export class FileProcessor {
  private projectName: string;
  private folderPath: string;

  constructor(projectName: string, folderPath: string) {
    this.projectName = projectName;
    this.folderPath = folderPath;
  }

  // 检查文件夹是否存在
  async validateFolder(): Promise<void> {
    if (!await fs.pathExists(this.folderPath)) {
      throw new Error(`Folder does not exist: ${this.folderPath}`);
    }

    const stats = await fs.stat(this.folderPath);
    if (!stats.isDirectory()) {
      throw new Error(`Path is not a directory: ${this.folderPath}`);
    }
  }

  // 检查文件是否应该被忽略
  private shouldIgnoreFile(filePath: string): boolean {
    const relativePath = path.relative(this.folderPath, filePath);
    return IGNORE_PATTERNS.some(pattern => {
      if (pattern.includes('*')) {
        // 简单的通配符匹配
        const regex = new RegExp(pattern.replace(/\*/g, '.*'));
        return regex.test(relativePath);
      }
      return relativePath.includes(pattern);
    });
  }

  // 递归读取文件夹内容
  private async readDirectory(dirPath: string, relativePath: string = ''): Promise<string[]> {
    const files: string[] = [];
    const items = await fs.readdir(dirPath);

    for (const item of items) {
      const fullPath = path.join(dirPath, item);
      const itemRelativePath = path.join(relativePath, item);

      if (this.shouldIgnoreFile(fullPath)) {
        continue;
      }

      const stats = await fs.stat(fullPath);
      if (stats.isDirectory()) {
        const subFiles = await this.readDirectory(fullPath, itemRelativePath);
        files.push(...subFiles);
      } else {
        files.push(itemRelativePath);
      }
    }

    return files;
  }

  // 处理单个文件
  private async processFile(filePath: string, relativePath: string): Promise<FileInfo> {
    const content = await fs.readFile(filePath);
    const base64Content = content.toString('base64');
    const extension = path.extname(filePath).slice(1);
    const contentType = mime.lookup(extension) || 'application/octet-stream';
    const hash = await blake3(base64Content + extension)
    const key = hash.slice(0, 32);

    return {
      fileName: relativePath,
      base64: true,
      key,
      metadata: {
        contentType
      },
      value: base64Content
    };
  }

  // 处理整个文件夹
  async processFolder(): Promise<{ files: FileInfo[], manifest: Record<string, string> }> {
    await this.validateFolder();

    const filePaths = await this.readDirectory(this.folderPath);
    const files: FileInfo[] = [];
    const manifest: Record<string, string> = {};

    for (const relativePath of filePaths) {
      const fullPath = path.join(this.folderPath, relativePath);
      const fileInfo = await this.processFile(fullPath, relativePath);
      files.push(fileInfo);
      manifest['/' + relativePath] = fileInfo.key;
    }

    return { files, manifest };
  }

  // 获取文件夹统计信息
  async getFolderStats(): Promise<{
    totalFiles: number;
    totalSize: number;
    fileTypes: Record<string, number>;
  }> {
    await this.validateFolder();

    const filePaths = await this.readDirectory(this.folderPath);
    let totalSize = 0;
    const fileTypes: Record<string, number> = {};

    for (const relativePath of filePaths) {
      const fullPath = path.join(this.folderPath, relativePath);
      const stats = await fs.stat(fullPath);
      totalSize += stats.size;

      const extension = path.extname(relativePath).slice(1) || 'no-extension';
      fileTypes[extension] = (fileTypes[extension] || 0) + 1;
    }

    return {
      totalFiles: filePaths.length,
      totalSize,
      fileTypes
    };
  }
}
