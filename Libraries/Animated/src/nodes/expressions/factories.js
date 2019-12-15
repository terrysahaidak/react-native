/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 * @format
 */

const AnimatedNode = require('../AnimatedNode');

import {ExpressionType} from './expressions';

const factories: {[key: ExpressionType]: Function} = {
  add: multiOperator('add'),
  sub: multiOperator('sub'),
  multiply: multiOperator('multiply'),
  divide: multiOperator('divide'),
  pow: multiOperator('pow'),
  modulo: multiOperator('modulo'),
  sqrt: single('sqrt'),
  log: single('log'),
  sin: single('sin'),
  cos: single('cos'),
  tan: single('tan'),
  acos: single('acos'),
  asin: single('asin'),
  atan: single('atan'),
  exp: single('exp'),
  round: single('round'),
  and: multiOperator('and'),
  or: multiOperator('or'),
  not: single('not'),
  eq: operator('eq'),
  neq: operator('neq'),
  lessThan: operator('lessThan'),
  greaterThan: operator('greaterThan'),
  lessOrEq: operator('lessOrEq'),
  greaterOrEq: operator('greaterOrEq'),
  cond: condition,
  set: setValue,
  block: block,
};

function resolve(v: AnimatedNode | number) {
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
      setValue: (value: number) => (v._value = value),
    };
  } else {
    // Number
    return {type: 'number', value: v};
  }
}

function setValue(target: AnimatedValue, source: Object) {
  return {
    type: 'set',
    target: resolve(target),
    source: resolve(source),
  };
}

function condition(
  expr: AnimatedNode | number,
  ifNode: AnimatedNode | number,
  elseNode: ?AnimatedNode | number,
) {
  return {
    type: 'cond',
    expr: resolve(expr),
    ifNode: resolve(ifNode),
    elseNode: resolve(elseNode ? elseNode : 0),
  };
}

function block(nodes: Array<AnimatedNode | number>) {
  return {
    type: 'block',
    nodes: nodes.map(resolve),
  };
}

function multiOperator(type: string) {
  return (
    a: AnimatedNode | number,
    b: AnimatedNode | number,
    ...others: Array<AnimatedNode | number>
  ) => ({
    type,
    a: resolve(a),
    b: resolve(b),
    others: others.map(resolve),
  });
}

function operator(type: string) {
  return (left: AnimatedNode | number, right: AnimatedNode | number) => ({
    type,
    left: resolve(left),
    right: resolve(right),
  });
}

function single(type: string) {
  return (v: AnimatedNode | number) => ({
    type,
    v: resolve(v),
  });
}

export {factories};
