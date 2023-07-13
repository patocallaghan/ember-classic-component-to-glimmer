const { getParser } = require('codemod-cli').jscodeshift;
const { getOptions } = require('codemod-cli');

module.exports = function transformer(file, api) {
  const j = getParser(api);

  return j(file.source)
    .find(j.ImportDeclaration, { source: { value: '@ember/component' } })
    .forEach((path) => {
      path.value.source.value = '@glimmer/component';
    })
    .toSource({ quote: 'single' });
};

module.exports.type = 'js';
