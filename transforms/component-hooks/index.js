const { getParser } = require('codemod-cli').jscodeshift;

module.exports = function transformer(file, api) {
  const j = getParser(api);

  return j(file.source)
    .find(j.ObjectMethod, function (node) {
      return (
        node.method &&
        [
          'init',
          'didReceiveAttrs',
          'willRender',
          'didInsertElement',
          'didRender',
          'didUpdateAttrs',
          'willUpdate',
          'didUpdate',
          'willDestroyElement',
          'willClearRender',
          'didDestroyElement',
        ].includes(node.key.name)
      );
    })
    .forEach((path) => {
      let hook = path.node.key.name;
      let comment = j.commentLine(
        ` CODE MIGRATION HINT: \`${hook}\` is a Classic Component hook and should not be used in Glimmer Components. For more information on how to migrate away from using it see https://go.inter.com/component-lifecycle-hooks.`,
        true,
        false
      );
      path.node.comments = path.node.comments || [];
      let hasExistingAsyncComment = path.node.comments.find((c) =>
        c.value.includes(
          `\`${hook}\` is a Classic Component hook and should not be used in Glimmer Components.`
        )
      );
      if (!hasExistingAsyncComment) {
        path.node.comments.push(comment);
      }
    })
    .toSource();
};

module.exports.type = 'js';
