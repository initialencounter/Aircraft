import type { ForgeConfig } from '@electron-forge/shared-types';
import { MakerSquirrel } from '@electron-forge/maker-squirrel'
import { execSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';

import { version } from './package.json';

const config: ForgeConfig = {
  hooks: {
    packageAfterCopy: async (config, buildPath, electronVersion, platform, arch) => {
      console.log('Running packageAfterCopy hook...');
      console.log(`Installing production dependencies in: ${buildPath}`);

      // Because we are in a monorepo, standard package.json might lack some dependencies 
      // or Yarn won't run properly inside the isolated build path without workspaces info.
      // Easiest reliable way for Electron Forge is to trigger a dedicated install 
      // without lockfiles focusing strictly on production dependencies for exactly this subtree.

      try {
        // Since we have workspace dependencies like "@aircraft/renderer": "workspace:*" in package.json
        // Native npm install will fail because it doesn't understand "workspace:*".
        // Instead of running npm install directly, we rewrite the package.json to remove workspace deps,
        // copy the actual local dependencies, and then run npm install on the rest.

        const packagedPkgJsonPath = path.join(buildPath, 'package.json');
        const pkgJson = JSON.parse(fs.readFileSync(packagedPkgJsonPath, 'utf8'));

        // Remove workspace dependencies so npm install doesn't crash
        delete pkgJson.devDependencies;
        pkgJson.dependencies = {}
        fs.writeFileSync(packagedPkgJsonPath, JSON.stringify(pkgJson, null, 2));

        // Change to the build directory (e.g., out/aircraft-win32-x64/resources/app)
        // Set NODE_ENV=production and use npm to natively install strictly what's in package.json dependencies
        // execSync('npm install --omit=dev --no-package-lock --no-audit --fund=false --legacy-peer-deps', {
        //   cwd: buildPath,
        //   stdio: 'inherit',
        //   env: {
        //     ...process.env,
        //     NODE_ENV: 'production'
        //   }
        // });

        // As a special case for the rust node addon from workspace: aircraft-rs
        // npm might fail to resolve `workspace:*` or local path, so we manually copy the raw addon.
        const targetNodeModules = path.join(buildPath, 'node_modules');
        const sourceAircraftRs = path.resolve(__dirname, '../bindings/node/aircraft-rs.win32-x64-msvc.node');

        if (fs.existsSync(sourceAircraftRs)) {
          const destAircraftRsDir = path.join(targetNodeModules, 'aircraft-rs');
          fs.mkdirSync(destAircraftRsDir, { recursive: true });
          fs.copyFileSync(sourceAircraftRs, path.join(destAircraftRsDir, 'aircraft-rs.win32-x64-msvc.node'));
          // Also need a dummy package.json or index.js for `aircraft-rs` so it resolves
          fs.writeFileSync(path.join(destAircraftRsDir, 'package.json'), JSON.stringify({ name: "aircraft-rs", main: "index.js" }));
          fs.writeFileSync(path.join(destAircraftRsDir, 'index.js'), `module.exports = require('./aircraft-rs.win32-x64-msvc.node');`);
          console.log(`Manually copied aircraft-rs into packaged node_modules.`);
        }

        const sourceMain = path.join(buildPath, 'main');
        const sourcepreload = path.join(buildPath, 'preload');
        fs.rmSync(sourceMain, { recursive: true, force: true });
        fs.rmSync(sourcepreload, { recursive: true, force: true });

      } catch (err) {
        console.error('Failed to install dependencies in packaged app:', err);
      }
    }
  },
  packagerConfig: {
    icon: path.resolve(__dirname, './public/favicon.ico'),
    asar: false,
    name: 'aircraft-electron',
    osxSign: {},
    ignore: [
      '.vite',
      "node_modules/.vite",
      "out",
      "public",
      "release",
      "renderer",
      "tmp",
      "types",
      "electron-env.d.ts",
      "forge.config.ts",
      "tsconfig.json",
      "vite.electron.config.ts",
    ],
    derefSymlinks: true,
  },
  makers: [
    new MakerSquirrel({
      name: 'aircraft',
      authors: 'initialencounter',
      description: 'Aircraft electron app',
      setupExe: `aircraft_${version}_electron_x64-setup.exe`
    })
  ],
};

export default config;