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

import {factories, createEvaluator, converters} from './expressions';

class AnimatedExpression extends AnimatedWithChildren {
  _graph: Object;
  _args: [];
  _evaluator: () => number;

  constructor(graph: Object) {
    super();
    this._graph = graph;
    this._args = [];
  }

  __attach() {
    collectArguments(this._graph, this._args);
    this._args.forEach(a => a.node.__addChild(this));
  }

  __detach() {
    this._args.forEach(a => a.node.__removeChild(this));
    super.__detach();
  }

  __getValue(): number {
    if (!this._evaluator) {
      this._evaluator = createEvaluator(this._graph);
    }
    return this._evaluator();
  }

  __getNativeConfig(): any {
    return {
      type: 'expression',
      graph: converters[this._graph.type](this._graph),
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
    collectArguments(node.target, args);
    collectArguments(node.source, args);
    node.others && node.others.forEach(n => collectArguments(n, args));
    node.nodes && node.nodes.forEach(n => collectArguments(n, args));
  }
}

// Add expression factories to the .E namespace in Animated
AnimatedExpression.E = {
  ...factories,
};

module.exports = AnimatedExpression;
