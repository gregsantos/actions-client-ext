'use strict';

const { merge } = require('webpack-merge');

const common = require('./webpack.common.js');
const PATHS = require('./paths');

// Merge webpack configuration files
const config = (env, argv) =>
  merge(common, {
    entry: {
      popup: PATHS.src + '/popup.js',
      contentScript: PATHS.src + '/contentScript.js',
      background: PATHS.src + '/background.js',
      inject: PATHS.src + '/inject.js',
      fclWrapper: PATHS.src + '/fclWrapper.js',
      web3: PATHS.src + '/libs/web3.min.js',
    },
    devtool: argv.mode === 'production' ? false : 'source-map',
  });

module.exports = config;
