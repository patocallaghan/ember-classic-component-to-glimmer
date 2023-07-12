'use strict';

const { runTransformTest } = require('codemod-cli');

runTransformTest({ 
  name: 'actions-hash',
  path: require.resolve('./index.js'),
  fixtureDir: `${__dirname}/__testfixtures__/`,
});