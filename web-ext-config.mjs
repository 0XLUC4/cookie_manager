// web-ext settings: only ship the extension files, never repo tooling.
export default {
  ignoreFiles: [
    'package.json', 'pnpm-lock.yaml', 'package-lock.json', 'web-ext-config.mjs', 'node_modules',
    'README.md', 'docs', 'dist', '.gitignore', 'screenshot', 'cookie-manager-extension', '*.zip', '*.py', 'icons/*.svg', '.env'
  ],
  build: { overwriteDest: true },
  artifactsDir: 'dist'
};
