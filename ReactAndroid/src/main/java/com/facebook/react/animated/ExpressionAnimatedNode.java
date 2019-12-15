/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.react.animated;

import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.ReadableMap;

interface EvalFunction {
  double eval();
}

interface ReduceMulti {
  double reduce(double prev, double cur);
}

interface ReduceSingle {
  double reduce(double v);
}

interface Reduce {
  double reduce(double left, double right);
}

/*package*/ class ExpressionAnimatedNode extends ValueAnimatedNode {

  private final NativeAnimatedNodesManager mNativeAnimatedNodesManager;
  private final ReadableMap mGraph;
  private EvalFunction mEvalFunc;

  public ExpressionAnimatedNode(
    ReadableMap config, NativeAnimatedNodesManager nativeAnimatedNodesManager) {
    mNativeAnimatedNodesManager = nativeAnimatedNodesManager;
    mGraph = config.getMap("graph");
  }

  @Override
  public void update() {
    if(mEvalFunc == null) {
      mEvalFunc = createEvalFunc(mGraph);
    }
    mValue = mEvalFunc.eval();
  }

  private static boolean isTrue(Object value) {
    return value != null && !value.equals(0.);
  }

  private EvalFunction createEvalFunc(ReadableMap node) {
    String type = node.getString("type");
    switch (type) {
      /* Multi ops */
      case "add": return createMultiOp(node, (p, c) -> p + c);
      case "sub": return createMultiOp(node, (p, c) -> p - c);
      case "multiply": return createMultiOp(node, (p, c) -> p * c);
      case "divide": return createMultiOp(node, (p, c) -> p / c);
      case "modulo": return createMultiOp(node, (p, c) -> ((p % c) + c) % c);
      case "pow": return createMultiOp(node, (p, c) -> Math.pow(p, c));
      /* Single ops */
      case "sqrt": createSingleOp(node, v -> Math.sqrt(v));
      case "log": createSingleOp(node, v -> Math.log(v));
      case "sin": createSingleOp(node, v -> Math.sin(v));
      case "cos": createSingleOp(node, v -> Math.cos(v));
      case "tan": createSingleOp(node, v -> Math.tan(v));
      case "acos": createSingleOp(node, v -> Math.acos(v));
      case "asin": createSingleOp(node, v -> Math.asin(v));
      case "atan": createSingleOp(node, v -> Math.atan(v));
      case "exp": createSingleOp(node, v -> Math.exp(v));
      case "round": createSingleOp(node, v -> Math.round(v));
      /* Logical */
      case "and": createMultiOp(node, (p, c) -> isTrue(p) && isTrue(c) ? 1.0 : 0.0);
      case "or": createMultiOp(node, (p, c) -> isTrue(p) || isTrue(c) ? 1.0 : 0.0);
      case "not": createSingleOp(node, v -> !isTrue(v) ? 1 : 0);
      /* Comparsion */
      case "eq": createOp(node, (left, right) -> left == right? 1.0 : 0.0);
      neq: createOp(node, (left, right) -> left != right ? 1.0 : 0.0);
      lessThan: createOp(node, (left, right) -> left < right ? 1.0 : 0.0);
      greaterThan: createOp(node, (left, right) -> left > right? 1.0 : 0.0);
      lessOrEq: createOp(node, (left, right) -> left <= right? 1.0 : 0.0);
      greaterOrEq: createOp(node, (left, right) -> left >= right? 1.0 : 0.0);
      /* Variables */
      case "value" : {
        int nodeId = node.getInt("value");
        ValueAnimatedNode animatedNode = (ValueAnimatedNode)mNativeAnimatedNodesManager.getNodeById(nodeId);
        if(animatedNode != null) {
          return () -> animatedNode.getValue();
        } else {
          return () -> 0;
        }
      }
      case "number": return () -> node.getDouble("value");
      /* Statements */
      case "cond" : return createCond(node);
      case "set": {

      }
      default:
        return () -> 0;
    }
  }

  private EvalFunction createCond(ReadableMap node) {
    EvalFunction expr = createEvalFunc(node.getMap("expr"));
    EvalFunction ifNode = createEvalFunc(node.getMap("ifNode"));
    EvalFunction elseNode = createEvalFunc(node.getMap("elseNode"));

    return () -> {
      double cond = expr.eval();
      return isTrue(cond) ? ifNode.eval() : elseNode.eval();
    };
  }

  private EvalFunction createMultiOp(ReadableMap node, ReduceMulti reducer) {
    EvalFunction a = createEvalFunc(node.getMap("a"));
    EvalFunction b = createEvalFunc(node.getMap("b"));
    ReadableArray others = node.getArray("others");

    return () -> {
      double acc = reducer.reduce(a.eval(), b.eval());
      return acc;
    };
  }

  private EvalFunction createSingleOp(ReadableMap node, ReduceSingle reducer) {
    EvalFunction v = createEvalFunc(node.getMap("v"));
    return () -> reducer.reduce(v.eval());
  }

  private EvalFunction createOp(ReadableMap node, Reduce reducer) {
    EvalFunction left = createEvalFunc(node.getMap("left"));
    EvalFunction right = createEvalFunc(node.getMap("right"));
    return () -> reducer.reduce(left.eval(), right.eval());
  }
}
