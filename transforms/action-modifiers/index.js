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

        // {{action "foo"}} -> {{on "click" this.foo}}
        if (action.type === 'StringLiteral') {
          newAction = b.path(`this.${action.value}`);
        }

        if (action.type === 'PathExpression' || action.type === 'SubExpression') {
          newAction = action;
        }

        newNode.params = [
          // ... on="keyup" -> {{on "keyup" ...}}
          b.string(eventName(node.hash)),
          node.params.length > 1 ? b.sexpr('fn', [newAction, ...curriedArgs]) : newAction,
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
          newNode.params = [
            // ... on="keyup" -> {{on "keyup" ...}}
            b.string(path.parent.node.name.replace(/^on/g, '')),
            node.params.length > 1 ? b.sexpr('fn', [newAction, ...curriedArgs]) : newAction,
          ];
          path.parent.parent.node.modifiers.push(newNode);
          return node;
        }

        return newNode;
      },
    };
  });
};

function hasUnsupportedOptions(node) {
  const preventDefault = node.hash.pairs.find((p) => p.key === 'preventDefault');
  const unsupportedPreventDefaultValue =
    preventDefault && preventDefault.value.type !== 'BooleanLiteral';

  const stopPropagation = node.hash.pairs.find((p) => p.key === 'bubbles');
  const unsupportedStopPropagationValue =
    stopPropagation && stopPropagation.value.type !== 'BooleanLiteral';

  return [
    unsupportedPreventDefaultValue &&
      `preventDefault=someDynamicValue (line ${node.loc.start.line}) is not supported`,
    unsupportedStopPropagationValue &&
      `bubbles=someDynamicValue (line ${node.loc.start.line}) is not supported`,
  ].filter(Boolean);
}

function eventName(hash) {
  const on = hash.pairs.find((p) => p.key === 'on');
  if (on) {
    return on.value.value;
  }
  return 'click';
}

function preventDefaultTrue(hash) {
  const preventDefault = hash.pairs.find((p) => p.key === 'preventDefault');
  return !preventDefault || preventDefault.value.value === true;
}

function bubblesFalse(hash) {
  return hash.pairs.some((p) => p.key === 'bubbles' && p.value.value === false);
}

function getTarget(hash) {
  return hash.pairs.find((p) => p.key === 'target');
}

function getValue(hash) {
  return hash.pairs.find((p) => p.key === 'value');
}

function getAllowedKeys(hash) {
  return hash.pairs.find((p) => p.key === 'allowedKeys');
}

function argIsClosureAction(expression) {
  return expression.type === 'SubExpression' && expression.path.original === 'action';
}

// COPY PASTE FROM event-properties.js TO MAKE THE FILE SELF-CONTAINED

function convertExpression(expr, b) {
  let action = expr;
  let params = [];
  let wrappedInAction = false;

  if (expr.path.original === 'action') {
    [action, ...params] = expr.params;
  } else {
    action = expr.path;
  }

  // {{action "foo"}} -> (action "foo")
  if (action.type === 'StringLiteral') {
    action = b.sexpr('action', [action]);
    wrappedInAction = true;
  }

  // {{action foo value="target.value"}} -> (action foo value="target.value")
  const value = getValue(expr.hash);
  if (value) {
    if (!wrappedInAction) {
      action = b.sexpr('action', [action]);
    }
    action.hash.pairs.push(value);
  }

  // {{action foo target=service}} -> (action foo target=service)
  const target = getTarget(expr.hash);
  if (target) {
    if (!wrappedInAction) {
      action = b.sexpr('action', [action]);
    }
    action.hash.pairs.push(target);
  }

  // {{action foo allowedKeys="alt"}} -> (action foo allowedKeys="alt")
  const allowedKeys = getAllowedKeys(expr.hash);
  if (allowedKeys) {
    if (!wrappedInAction) {
      action = b.sexpr('action', [action]);
    }
    action.hash.pairs.push(allowedKeys);
  }

  // {{action foo bar}} -> (fn foo bar)
  if (params.length) {
    action = b.sexpr('fn', [action, ...params]);
  }

  return action;
}

function transformAction(b, node) {
  const unsupportedOptions = hasUnsupportedOptions(node);
  if (unsupportedOptions.length) {
    unsupportedOptions.forEach((msg) => {
      console.log(`[${node}] ${msg}`);
    });
    return node;
  }

  if (node.path.original !== 'action') {
    return node;
  }

  const newNode = b.mustache('on');
  let newAction = null;

  let [action, ...curriedArgs] = node.params;

  // {{action "foo"}} -> {{on "click" this.foo}}
  if (action.type === 'StringLiteral') {
    newAction = b.path(`this.${action.value}`);
  }

  if (action.type === 'PathExpression') {
    newAction = action;
  }

  newNode.params = [
    // ... on="keyup" -> {{on "keyup" ...}}
    b.string(eventName(node.hash)),
    newAction,
  ];

  return newNode;
}

module.exports.type = 'hbs';
