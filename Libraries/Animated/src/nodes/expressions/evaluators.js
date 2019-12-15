/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 * @format
 */

import {ExpressionType} from './expressions';

const evaluators: {[key: ExpressionType]: Function} = {
  add: (node: Object) => multiOperator(node, (p, c) => p + c),
  sub: (node: Object) => multiOperator(node, (p, c) => p - c),
  multiply: (node: Object) => multiOperator(node, (p, c) => p * c),
  divide: (node: Object) => multiOperator(node, (p, c) => p / c),
  pow: (node: Object) => multiOperator(node, (p, c) => Math.pow(p, c)),
  modulo: (node: Object) => multiOperator(node, (p, c) => ((p % c) + c) % c),
  sqrt: (node: Object) => singleOperator(node, v => Math.sqrt(v)),
  log: (node: Object) => singleOperator(node, v => Math.log(v)),
  sin: (node: Object) => singleOperator(node, v => Math.sin(v)),
  cos: (node: Object) => singleOperator(node, v => Math.cos(v)),
  tan: (node: Object) => singleOperator(node, v => Math.tan(v)),
  acos: (node: Object) => singleOperator(node, v => Math.acos(v)),
  asin: (node: Object) => singleOperator(node, v => Math.asin(v)),
  atan: (node: Object) => singleOperator(node, v => Math.atan(v)),
  exp: (node: Object) => singleOperator(node, v => Math.exp(v)),
  round: (node: Object) => singleOperator(node, v => Math.round(v)),
  and: (node: Object) => multiOperator(node, (p, c) => p && c),
  or: (node: Object) => multiOperator(node, (p, c) => p || c),
  not: (node: Object) => singleOperator(node, v => !v),
  eq: (node: Object) => operator(node, (left, right) => left === right),
  neq: (node: Object) => operator(node, (left, right) => left !== right),
  lessThan: (node: Object) => operator(node, (left, right) => left < right),
  greaterThan: (node: Object) => operator(node, (left, right) => left > right),
  lessOrEq: (node: Object) => operator(node, (left, right) => left <= right),
  greaterOrEq: (node: Object) => operator(node, (left, right) => left >= right),
  value: (node: Object) => () => node.getValue(),
  number: (node: Object) => () => node.value,
  cond: condition,
  set: setValue,
  block: block,
};

function createEvaluator(node: AnimatedNode | number | Object): () => number {
  if (typeof node === 'number') {
    return () => node;
  } else if (node.hasOwnProperty('__attach')) {
    return () => node.__getValue();
  }
  if (!evaluators[node.type]) {
    throw new Error('Error: Node type ' + node.type + ' not found.');
  }
  return evaluators[node.type](node);
}

function block(node: Object) {
  const evalFuncs = node.nodes.map(createEvaluator);
  return () => {
    let retVal = 0;
    for (let i = 0; i < evalFuncs.length; i++) {
      retVal = evalFuncs[i]();
    }
    return retVal;
  };
}

function setValue(node: Object) {
  const source = createEvaluator(node.source);
  return () => {
    const retVal = source();
    node.target.setValue(retVal);
    return retVal;
  };
}

function condition(node: Object) {
  const expr = createEvaluator(node.expr);
  const ifEval = createEvaluator(node.ifNode);
  const falseEval = node.elseNode ? createEvaluator(node.elseNode) : () => 0;

  return () => {
    const cond = expr();
    if (cond) {
      return ifEval();
    } else {
      return falseEval();
    }
  };
}

function multiOperator(
  node: Object,
  reducer: (prev: number, cur: number) => number,
) {
  const a = createEvaluator(node.a);
  const b = createEvaluator(node.b);
  const others = (node.others || []).map(createEvaluator);
  return () => {
    let acc = reducer(a(), b());
    for (let i = 0; i < others.length; i++) {
      acc = reducer(acc, others[i]());
    }
    return acc;
  };
}

function singleOperator(node: Object, reducer: (v: number) => number) {
  const v = createEvaluator(node.v);
  return () => {
    return reducer(v());
  };
}

function operator(
  node: Object,
  reducer: (left: number, right: number) => number,
) {
  console.info(node);
  const left = createEvaluator(node.left);
  const right = createEvaluator(node.right);
  return () => {
    return reducer(left(), right());
  };
}

export {createEvaluator};
