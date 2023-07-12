const { getParser } = require('codemod-cli').jscodeshift;

module.exports = function transformer(file, api) {
  const j = getParser(api);

  let newSource = j(file.source)
    .find(j.ObjectExpression)
    .forEach((path) => {
      path.value.properties.forEach((p) => {
        if (p.key.name === 'actions') {
          let newActions = p.value.properties.map((prop) => {
            let newProp =
              prop.type === 'ObjectMethod'
                ? j.functionExpression(
                    prop.id,
                    prop.params,
                    prop.body,
                    prop.generator,
                    prop.expression
                  )
                : prop.value;
            newProp.async = prop.async;
            return j.objectProperty(prop.key, j.callExpression(j.identifier('action'), [newProp]));
          });
          path.value.properties = [...path.value.properties, ...newActions].filter(
            (p) => !p.key || p.key.name !== 'actions'
          );
        }
      });
    })
    .toSource({ quote: 'single' });

  newSource = addImportIfNecessary(j, newSource, 'action', '@ember/object');
  return newSource;
};

module.exports.type = 'js';

function addImportIfNecessary(j, newSource, specifierName, sourceName) {
  const importStatement = j(newSource)
    .find(j.ImportDeclaration, {
      source: {
        value: sourceName,
      },
    })
    .filter((path) => {
      const importedSpecifiers = path.node.specifiers;
      return importedSpecifiers.some((specifier) => specifier.local.name === specifierName);
    });

  if (importStatement.length === 0) {
    const ast = j(newSource);
    const existingImport = ast.find(j.ImportDeclaration, {
      source: {
        value: sourceName,
      },
    });
    const importSpecifier = j.importSpecifier(j.identifier(specifierName));

    if (existingImport.length > 0) {
      // Import source already exists, add specifier to existing import declaration
      existingImport.forEach((path) => {
        path.node.specifiers.push(importSpecifier);
      });
    } else {
      // Import source does not exist, create a new import declaration
      const importDeclaration = j.importDeclaration([importSpecifier], j.literal(sourceName));

      // Find the last import declaration in the AST
      const lastImport = ast.find(j.ImportDeclaration).at(-1);

      if (lastImport.length > 0) {
        // Append the new import declaration after the last existing import
        lastImport.insertAfter(importDeclaration);
      } else {
        // No existing import declarations, add the new import declaration to the top of the AST
        ast.get().node.program.body.unshift(importDeclaration);
      }
      newSource = ast.toSource({ quote: 'single' });
    }
  }
  return newSource;
}
