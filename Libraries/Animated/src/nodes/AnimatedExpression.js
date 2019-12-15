/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 * @format
 */

'use strict';

const AnimatedInterpolation = require('./AnimatedInterpolation');
const AnimatedNode = require('./AnimatedNode');
const AnimatedWithChildren = require('./AnimatedWithChildren');

import type {InterpolationConfigType} from './AnimatedInterpolation';

class AnimatedExpression extends AnimatedWithChildren {
  _graph: Object;
  _args: [];
  _evalFunc: () => number;

  constructor(graph: Object) {
    super();
    this._graph = graph;
    this._args = [];
  }

  __attach() {
    // Collect all child nodes in expression and add self as child to
    // receive updates
    collectArguments(this._graph, this._args);
    this._args.forEach(a => a.node.__attach(this));
  }

  __detach() {
    this._args.forEach(a => a.node.__detach(this));
    super.__detach();
  }

  __getValue(): number {
    if (!this._evalFunc) {
      this._evalFunc = createEvalFunc(this._graph);
    }
    return this._evalFunc();
  }

  __getNativeConfig(): any {
    return {
      type: 'expression',
      graph: expressionMap[this._graph.type].convertFunc(this._graph),
    };
  }

  interpolate(config: InterpolationConfigType): AnimatedInterpolation {
    return new AnimatedInterpolation(this, config);
  }
}

/* Arguments */
function collectArguments(node: ?Object, args: AnimatedNode[]) {
  if (node) {
    if (node.type === 'value') {
      args.push(node);
    }
    collectArguments(node.a, args);
    collectArguments(node.b, args);
    collectArguments(node.left, args);
    collectArguments(node.right, args);
    collectArguments(node.expr, args);
    collectArguments(node.ifNode, args);
    collectArguments(node.elseNode, args);
    node.others && node.others.forEach(n => collectArguments(n, args));
  }
}

/* Evaluation tree */

function createEvalFunc(node: AnimatedNode | number | Object): () => number {
  if (typeof node === 'number') {
    return () => node;
  } else if (node.__getValue) {
    return () => node.__getValue();
  }
  if (!expressionMap[node.type]) {
    throw new Error('Error: Node type ' + node.type + ' not found.');
  }
  return expressionMap[node.type].createEvalFunc(node);
}

function createEvalSet(node: Object) {
  const source = createEvalFunc(node.trueCond);
  return () => node.target.setValue(source());
}

function createEvalCondition(node: Object) {
  const expr = createEvalFunc(node.expr);
  const trueCond = createEvalFunc(node.ifNode);
  const falseCond = createEvalFunc(node.elseNode);

  return () => {
    const cond = expr();
    if (cond) {
      return trueCond();
    } else {
      return falseCond();
    }
  };
}

function createEvalMultiOpFunc(
  node: Object,
  reducer: (prev: number, cur: number) => number,
) {
  const a = createEvalFunc(node.a);
  const b = createEvalFunc(node.b);
  const others = (node.others || []).map(createEvalFunc);
  return () => {
    let acc = reducer(a(), b());
    for (let i = 0; i < others.length; i++) {
      acc = reducer(acc, others[i]());
    }
    return acc;
  };
}

function createEvalSingleOpFunc(node: Object, reducer: (v: number) => number) {
  const v = createEvalFunc(node.v);
  return () => {
    return reducer(v());
  };
}

function createEvalOpFunc(
  node: Object,
  reducer: (left: number, right: number) => number,
) {
  const left = createEvalFunc(node.left);
  const right = createEvalFunc(node.right);
  return () => {
    return reducer(left(), right());
  };
}

/* Conversion to native */

const convert = (v: number | Object) => {
  if (typeof v === 'number') {
    return {type: 'number', value: v};
  }
  return expressionMap[v.type].convertFunc(v);
};

const convertMultiOp = (node: Object) => {
  return {
    type: node.type,
    a: convert(node.a),
    b: convert(node.b),
    others: (node.others || []).map(convert),
  };
};

const convertSingleOp = (node: Object) => ({
  type: node.type,
  v: convert(node.v),
});

const convertOp = (node: Object) => {
  return {
    type: node.type,
    left: convert(node.left),
    right: convert(node.right),
  };
};

const convertValue = (node: Object) => {
  return {
    type: node.type,
    tag: node.getTag(),
  };
};

const convertNumber = (node: Object) => ({type: node.type, value: node.value});

/* Factories */
const valueFactory = (v: AnimatedNode | number) => {
  if (v instanceof Object) {
    // Expression object
    if (v.hasOwnProperty('type')) {
      return v;
    }
    // Animated value / node
    return {
      type: 'value',
      node: v,
      getTag: v.__getNativeTag.bind(v),
      getValue: v.__getValue.bind(v),
    };
  } else {
    // Number
    return {type: 'number', value: v};
  }
};

const multipOpFactory = (type: string) => (
  a: AnimatedNode | number,
  b: AnimatedNode | number,
  ...others: Array<AnimatedNode | number>
) => ({
  type,
  a: valueFactory(a),
  b: valueFactory(b),
  others: others.map(valueFactory),
});

const opFactory = (type: string) => (
  left: AnimatedNode | number,
  right: AnimatedNode | number,
) => ({
  type,
  left: valueFactory(left),
  right: valueFactory(right),
});

const singleOpFactory = (type: string) => (v: AnimatedNode | number) => ({
  type,
  v: valueFactory(v),
});

/* Helpers */

const createMultiOp = (
  type: string,
  reducer: (p: number, c: number) => number,
) => ({
  factory: multipOpFactory(type),
  convertFunc: convertMultiOp,
  createEvalFunc: (node: Object) => createEvalMultiOpFunc(node, reducer),
});

const createSingleOp = (type: string, reducer: (v: number) => number) => ({
  factory: singleOpFactory(type),
  convertFunc: convertSingleOp,
  createEvalFunc: (node: Object) => createEvalSingleOpFunc(node, reducer),
});

const createOp = (
  type: string,
  reducer: (left: number, right: number) => number,
) => ({
  factory: opFactory(type),
  convertFunc: convertOp,
  createEvalFunc: (node: Object) => createEvalOpFunc(node, reducer),
});

/* Expression map */
const expressionMap = {
  /* Multi ops */
  add: createMultiOp('add', (p, c) => p + c),
  sub: createMultiOp('sub', (p, c) => p - c),
  multiply: createMultiOp('multiply', (p, c) => p * c),
  divide: createMultiOp('divide', (p, c) => p / c),
  pow: createMultiOp('pow', (p, c) => Math.pow(p, c)),
  modulo: createMultiOp('mod', (p, c) => ((p % c) + c) % c),
  /* Single ops */
  sqrt: createSingleOp('sqrt', v => Math.sqrt(v)),
  log: createSingleOp('log', v => Math.log(v)),
  sin: createSingleOp('sin', v => Math.sin(v)),
  cos: createSingleOp('cos', v => Math.cos(v)),
  tan: createSingleOp('tan', v => Math.tan(v)),
  acos: createSingleOp('acos', v => Math.acos(v)),
  asin: createSingleOp('asin', v => Math.asin(v)),
  atan: createSingleOp('atan', v => Math.atan(v)),
  exp: createSingleOp('exp', v => Math.exp(v)),
  round: createSingleOp('round', v => Math.round(v)),
  /* Logical */
  and: createMultiOp('and', (p, c) => p && c),
  or: createMultiOp('or', (p, c) => p || c),
  not: createSingleOp('not', v => !v),
  /* Comparsion */
  eq: createOp('eq', (left, right) => left === right),
  neq: createOp('neq', (left, right) => left !== right),
  lessThan: createOp('lessThan', (left, right) => left < right),
  greaterThan: createOp('greaterThan', (left, right) => left > right),
  lessOrEq: createOp('lessOrEq', (left, right) => left <= right),
  greaterOrEq: createOp('greaterOrEq', (left, right) => left >= right),
  /* Variables */
  value: {
    factory: () => ({}),
    convertFunc: convertValue,
    createEvalFunc: (node: Object) => () => node.getValue(),
  },
  number: {
    factory: () => ({}),
    convertFunc: convertNumber,
    createEvalFunc: (node: Object) => () => node.value,
  },
  /* Statements */
  cond: {
    factory: (
      expr: AnimatedNode | number,
      ifNode: AnimatedNode | number,
      elseNode: ?AnimatedNode | number,
    ) => ({
      type: 'cond',
      expr: expr,
      ifNode: ifNode,
      elseNode: elseNode ? elseNode : {type: 'number', value: 0},
    }),
    convertFunc: (node: Object) => {
      return {
        type: node.type,
        expr: convert(node.expr),
        ifNode: convert(node.ifNode),
        elseNode: convert(node.elseNode),
      };
    },
    createEvalFunc: (node: Object) => createEvalCondition(node),
  },
  set: {
    convertFunc: (node: Object) => ({
      type: node.type,
      target: node.target.__getNativeTag(),
      source: expressionMap[node.type].convertFunc(node.source),
    }),
    createEvalFunc: (node: Object) => createEvalSet(node),
  },
};

AnimatedExpression.E = {};
Object.keys(expressionMap).forEach(
  k => (AnimatedExpression.E[k] = expressionMap[k].factory),
);

module.exports = AnimatedExpression;
