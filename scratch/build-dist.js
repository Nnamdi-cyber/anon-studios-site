const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, '..');
const DIST_DIR = path.join(__dirname, '../dist-ipfs');

// List of top-level files to copy directly
const FILES_TO_COPY = [
  'index.html',
  'admin.html',
  'home-animations.js',
  'home-interactions.js',
  'site-content.js'
];

// List of folders to copy recursively
const FOLDERS_TO_COPY = [
  'gallery',
  'photo-gallery',
  'video-gallery',
  'assets'
];

function deleteFolderRecursive(directoryPath) {
  if (fs.existsSync(directoryPath)) {
    fs.readdirSync(directoryPath).forEach((file) => {
      const curPath = path.join(directoryPath, file);
      if (fs.lstatSync(curPath).isDirectory()) {
        deleteFolderRecursive(curPath);
      } else {
        fs.unlinkSync(curPath);
      }
    });
    fs.rmdirSync(directoryPath);
  }
}

function copyFolderRecursiveSync(from, to) {
  if (!fs.existsSync(to)) {
    fs.mkdirSync(to, { recursive: true });
  }
  
  fs.readdirSync(from).forEach((element) => {
    const fromPath = path.join(from, element);
    const toPath = path.join(to, element);
    
    // Skip node_modules, git, and other unneeded paths if copying root, but we explicitly list dirs
    const stat = fs.lstatSync(fromPath);
    if (stat.isDirectory()) {
      copyFolderRecursiveSync(fromPath, toPath);
    } else {
      fs.copyFileSync(fromPath, toPath);
    }
  });
}

async function build() {
  console.log('Cleaning existing dist-ipfs directory...');
  deleteFolderRecursive(DIST_DIR);
  
  fs.mkdirSync(DIST_DIR, { recursive: true });
  console.log('Created empty dist-ipfs directory.');

  // Copy files
  FILES_TO_COPY.forEach(file => {
    const srcPath = path.join(SRC_DIR, file);
    const distPath = path.join(DIST_DIR, file);
    if (fs.existsSync(srcPath)) {
      fs.copyFileSync(srcPath, distPath);
      console.log(`Copied ${file} -> dist-ipfs/${file}`);
    } else {
      console.warn(`Warning: source file ${srcPath} does not exist.`);
    }
  });

  // Copy folders
  FOLDERS_TO_COPY.forEach(folder => {
    const srcPath = path.join(SRC_DIR, folder);
    const distPath = path.join(DIST_DIR, folder);
    if (fs.existsSync(srcPath)) {
      copyFolderRecursiveSync(srcPath, distPath);
      console.log(`Recursively copied directory ${folder}/ -> dist-ipfs/${folder}/`);
    } else {
      console.warn(`Warning: source folder ${srcPath} does not exist.`);
    }
  });

  console.log('\n🎉 Re-build completed successfully!\n');
}

build().catch(err => {
  console.error('❌ Build failed:', err);
  process.exit(1);
});
