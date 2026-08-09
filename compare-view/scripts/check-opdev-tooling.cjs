'use strict';

const webpackUtility = '@lark-opdev/block-bitable-webpack-utils';
const embeddedRuntime = '@bdeefe/feishu-devtools-core';

try {
  require(webpackUtility);
  console.log(`Verified ${webpackUtility} can load.`);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);

  if (
    error &&
    error.code === 'MODULE_NOT_FOUND' &&
    message.includes(embeddedRuntime)
  ) {
    console.error(
      [
        'The official opdev CLI runtime was not restored into node_modules.',
        'From compare-view, recreate the locked dependency tree with:',
        '  npm ci',
        'Do not use --ignore-scripts; the CLI needs its postinstall recovery step.',
      ].join('\n'),
    );
    process.exitCode = 1;
  } else {
    throw error;
  }
}
