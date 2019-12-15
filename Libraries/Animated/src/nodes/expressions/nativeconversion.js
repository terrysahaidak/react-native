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

const converters: {[key: ExpressionType]: Function} = {
  add: multiOperator,
  sub: multiOperator,
  multiply: multiOperator,
  divide: multiOperator,
  pow: multiOperator,
  modulo: multiOperator,
  sqrt: singleOperator,
  log: singleOperator,
  sin: singleOperator,
  cos: singleOperator,
  tan: singleOperator,
  acos: singleOperator,
  asin: singleOperator,
  atan: singleOperator,
  exp: singleOperator,
  round: singleOperator,
  and: multiOperator,
  or: multiOperator,
  not: singleOperator,
  eq: operator,
  neq: operator,
  lessThan: operator,
  greaterThan: operator,
  lessOrEq: operator,
  greaterOrEq: operator,
  value: animatedValue,
  number: convertNumber,
  cond: (node: Object) => ({
    type: node.type,
    expr: convert(node.expr),
    ifNode: convert(node.ifNode),
    elseNode: convert(node.elseNode),
  }),
  set: (node: Object) => ({
    type: node.type,
    target: node.target.getTag(), // This is safe - target MUST be an animated value node
    source: convert(node.source),
  }),
  block: (node: Object) => ({
    type: node.type,
    nodes: node.nodes.map(convert),
  }),
};

function convert(v: number | Object) {
  if (typeof v === 'number') {
    return {type: 'number', value: v};
  }
  return converters[v.type](v);
}

function multiOperator(node: Object) {
  return {
    type: node.type,
    a: convert(node.a),
    b: convert(node.b),
    others: (node.others || []).map(convert),
  };
}

function singleOperator(node: Object) {
  return {
    type: node.type,
    v: convert(node.v),
  };
}

function operator(node: Object) {
  return {
    type: node.type,
    left: convert(node.left),
    right: convert(node.right),
  };
}

function animatedValue(node: Object) {
  return {
    type: node.type,
    tag: node.getTag(),
  };
}

function convertNumber(node: Object) {
  return {type: node.type, value: node.value};
}

export {converters};
