'use strict';

const webpack = require('webpack');
const WebpackBar = require('webpackbar');

try {
  webpack({
    mode: 'development',
    context: process.cwd(),
    entry: './src/index.tsx',
    plugins: [new WebpackBar()],
  });
  console.log('Verified webpackbar can create a Webpack compiler.');
} catch (error) {
  console.error('webpackbar is incompatible with the installed Webpack version.');
  throw error;
}
