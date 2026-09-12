const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const esbuild = require('esbuild');

// Load the SDK's actual enum declarations without initializing its browser host.
const sdkTypes = fs.readFileSync(
  path.resolve(__dirname, '../node_modules/@lark-opdev/block-bitable-api/dist/index.d.ts'),
  'utf8'
);
const enums = [...sdkTypes.matchAll(/declare enum \w+ \{[\s\S]*?\n\}/g)]
  .map(([declaration]) => declaration.replace('declare enum', 'export enum'))
  .join('\n');

async function main() {
  const entry = process.argv[2];
  if (!entry || !/^[a-z-]+$/.test(entry)) throw new Error('Provide a check name.');
  const result = await esbuild.build({
    entryPoints: [path.join(__dirname, 'tests', `${entry}.tsx`)],
    bundle: true,
    platform: 'node',
    format: 'cjs',
    write: false,
    logLevel: 'silent',
    plugins: [{
      name: 'sdk-enums-without-host',
      setup(build) {
        build.onResolve({ filter: /^@lark-opdev\/block-bitable-api$/ }, () => ({
          path: 'sdk-enums', namespace: 'sdk-enums'
        }));
        build.onLoad({ filter: /.*/, namespace: 'sdk-enums' }, () => ({
          contents: enums, loader: 'ts'
        }));
      }
    }]
  });
  const checkModule = new Module(entry, module);
  checkModule.filename = path.join(__dirname, `${entry}.cjs`);
  checkModule.paths = module.paths;
  checkModule._compile(result.outputFiles[0].text, checkModule.filename);
  await checkModule.exports.check();
  console.log(`Verified ${entry}.`);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
