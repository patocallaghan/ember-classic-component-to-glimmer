module.exports = function ({ source /*, path*/ }, { parse, visit }) {
  const ast = parse(source);

  return visit(ast, (env) => {
    let { builders: b } = env.syntax;

    return {
      ElementModifierStatement(node) {
        if (node.path.original !== 'action') {
          return node;
        }

        const newNode = b.mustache('on');
        let newAction = null;

        let [action, ...curriedArgs] = node.params;
        let value = node.hash?.pairs?.find((p) => p.key === 'value');

        // {{action "foo"}} -> {{on "click" this.foo}}
        if (action.type === 'StringLiteral') {
          newAction = b.path(`this.${action.value}`);
        }

        if (action.type === 'PathExpression' || action.type === 'SubExpression') {
          newAction = action;
        }

        newAction = node.params.length > 1 ? generateFn(b, newAction, curriedArgs) : newAction;
        newAction = value ? generatePick(b, value, newAction) : newAction;
        newNode.params = [
          // ... on="keyup" -> {{on "keyup" ...}}
          b.string(eventName(node.hash)),
          newAction,
        ];

        return newNode;
      },
      MustacheStatement(node, path) {
        if (node.path.original !== 'action') {
          return node;
        }

        let newAction = null;
        let newNode = null;

        let [action, ...curriedArgs] = node.params;

        let value = node.hash?.pairs?.find((p) => p.key === 'value');

        // {{action "foo"}} -> {{on "click" this.foo}}
        if (action.type === 'StringLiteral') {
          newAction = b.path(`this.${action.value}`);
        }

        if (action.type === 'PathExpression') {
          newAction = action;
        }

        if (action.type === 'SubExpression') {
          newAction = action;
        }

        if (node.params.length > 1) {
          newNode = b.mustache(b.path('fn'), [newAction, ...curriedArgs]);
        } else if (action.type === 'SubExpression') {
          newNode = b.mustache(b.path(action.path.original), action.params);
        } else {
          newNode = b.mustache(newAction);
        }

        if (
          path.parent.node.type === 'AttrNode' &&
          !path.parent.node.name.startsWith('@') &&
          path.parent.node.name.startsWith('on')
        ) {
          path.parent.parent.node.attributes = path.parent.parent.node.attributes.filter(
            (a) => a !== path.parent.node
          );
          newNode = b.mustache('on');
          newAction = node.params.length > 1 ? generateFn(b, newAction, curriedArgs) : newAction;
          newAction = value ? generatePick(b, value, newAction) : newAction;
          newNode.params = [
            // ... on="keyup" -> {{on "keyup" ...}}
            b.string(path.parent.node.name.replace(/^on/g, '')),
            newAction,
          ];
          path.parent.parent.node.modifiers.push(newNode);
          return node;
        }

        return newNode;
      },
    };
  });
};

function generateFn(b, newAction, curriedArgs = []) {
  return  b.sexpr('fn', [newAction, ...curriedArgs]);
}

function generatePick(b, value, newAction) {
  return b.sexpr('pick', [value.value, newAction]);
}

function eventName(hash) {
  const on = hash.pairs.find((p) => p.key === 'on');
  if (on) {
    return on.value.value.toLowerCase();
  }
  return 'click';
}

module.exports.type = 'hbs';
