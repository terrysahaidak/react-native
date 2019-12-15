
/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import <React/RCTExpressionAnimatedNode.h>
#import <React/RCTNativeAnimatedNodesManager.h>
#import <React/RCTValueAnimatedNode.h>

typedef CGFloat ( ^evalBlock )(void);
typedef CGFloat ( ^evalOpReducer )(CGFloat left, CGFloat right);
typedef CGFloat ( ^evalMultipOpReducer )(CGFloat prev, CGFloat cur);
typedef CGFloat ( ^evalSingleOpReducer )(CGFloat v);

@implementation RCTExpressionAnimatedNode
{
  evalBlock _evalBlock;
  NSDictionary* _graph;
}

- (instancetype)initWithTag:(NSNumber *)tag
                     config:(NSDictionary<NSString *, id> *)config
{
  if (self = [super initWithTag:tag config:config]) {
    _graph = config[@"graph"];
    // NSLog(@"%@", _graph);
  }

  return self;
}

- (void)performUpdate
{
  [super performUpdate];
  if(!_evalBlock) {
    _evalBlock = [self evalBlockWithNode:_graph];
  }
  
  self.value = _evalBlock();
  
  // Force update each frame
  [self setNeedsUpdate];
}

- (evalBlock) evalBlockWithNode:(NSDictionary*)node {
  NSString* type = node[@"type"];
  /* Multi operators */
  if([type isEqualToString:@"add"]) {
    return [self evalBlockWithMultiOperator:node reducer:^CGFloat(CGFloat prev, CGFloat cur) {
      return prev + cur;
    }];
  } else if([type isEqualToString:@"sub"]) {
    return [self evalBlockWithMultiOperator:node reducer:^CGFloat(CGFloat prev, CGFloat cur) {
      return prev - cur;
    }];
  } else if([type isEqualToString:@"multiply"]) {
    return [self evalBlockWithMultiOperator:node reducer:^CGFloat(CGFloat prev, CGFloat cur) {
      return prev * cur;
    }];
  } else if([type isEqualToString:@"divide"]) {
    return [self evalBlockWithMultiOperator:node reducer:^CGFloat(CGFloat prev, CGFloat cur) {
      return prev / cur;
    }];
  } else if([type isEqualToString:@"pow"]) {
    return [self evalBlockWithMultiOperator:node reducer:^CGFloat(CGFloat prev, CGFloat cur) {
      return pow(prev, cur);
    }];
  } else if([type isEqualToString:@"mod"]) {
    return [self evalBlockWithMultiOperator:node reducer:^CGFloat(CGFloat prev, CGFloat cur) {
      return fmodf(fmodf(prev, cur) + cur, cur);
    }];
  }
  /* Single operators*/
  else if([type isEqualToString:@"sqrt"]) {
    return [self evalBlockWithSingleOperator:node reducer:^CGFloat(CGFloat v) {
      return sqrt(v);
    }];
  } else if([type isEqualToString:@"log"]) {
    return [self evalBlockWithSingleOperator:node reducer:^CGFloat(CGFloat v) {
      return log(v);
    }];
  } else if([type isEqualToString:@"sin"]) {
    return [self evalBlockWithSingleOperator:node reducer:^CGFloat(CGFloat v) {
      return sin(v);
    }];
  } else if([type isEqualToString:@"cos"]) {
    return [self evalBlockWithSingleOperator:node reducer:^CGFloat(CGFloat v) {
      return cos(v);
    }];
  } else if([type isEqualToString:@"tan"]) {
    return [self evalBlockWithSingleOperator:node reducer:^CGFloat(CGFloat v) {
      return tan(v);
    }];
  } else if([type isEqualToString:@"acos"]) {
    return [self evalBlockWithSingleOperator:node reducer:^CGFloat(CGFloat v) {
      return acos(v);
    }];
  } else if([type isEqualToString:@"asin"]) {
    return [self evalBlockWithSingleOperator:node reducer:^CGFloat(CGFloat v) {
      return asin(v);
    }];
  } else if([type isEqualToString:@"atan"]) {
    return [self evalBlockWithSingleOperator:node reducer:^CGFloat(CGFloat v) {
      return atan(v);
    }];
  } else if([type isEqualToString:@"exp"]) {
    return [self evalBlockWithSingleOperator:node reducer:^CGFloat(CGFloat v) {
      return exp(v);
    }];
  } else if([type isEqualToString:@"round"]) {
    return [self evalBlockWithSingleOperator:node reducer:^CGFloat(CGFloat v) {
      return round(v);
    }];
  }
  /* Logical */
  else if([type isEqualToString:@"and"]) {
    return [self evalBlockWithMultiOperator:node reducer:^CGFloat(CGFloat prev, CGFloat cur) {
      return prev && cur;
    }];
  } else if([type isEqualToString:@"or"]) {
    return [self evalBlockWithMultiOperator:node reducer:^CGFloat(CGFloat prev, CGFloat cur) {
      return prev || cur;
    }];
  } else if([type isEqualToString:@"not"]) {
    return [self evalBlockWithSingleOperator:node reducer:^CGFloat(CGFloat v) {
      return !v;
    }];
  }
  /* Comparsion */
  else if([type isEqualToString:@"eq"]) {
    return [self evalBlockWithOperator:node reducer:^CGFloat(CGFloat left, CGFloat right) {
      return left == right;
    }];
  } else if([type isEqualToString:@"neq"]) {
    return [self evalBlockWithOperator:node reducer:^CGFloat(CGFloat left, CGFloat right) {
      return left != right;
    }];
  } else if([type isEqualToString:@"lessThan"]) {
    return [self evalBlockWithOperator:node reducer:^CGFloat(CGFloat left, CGFloat right) {
      return left < right;
    }];
  } else if([type isEqualToString:@"greaterThan"]) {
    return [self evalBlockWithOperator:node reducer:^CGFloat(CGFloat left, CGFloat right) {
      return left > right;
    }];
  } else if([type isEqualToString:@"lessOrEq"]) {
    return [self evalBlockWithOperator:node reducer:^CGFloat(CGFloat left, CGFloat right) {
      return left <= right;
    }];
  } else if([type isEqualToString:@"greaterOrEq"]) {
    return [self evalBlockWithOperator:node reducer:^CGFloat(CGFloat left, CGFloat right) {
      return left >= right;
    }];
  }
  /* Statements */
  else if([type isEqualToString:@"cond"]) {
    return [self evalBlockWithCondition: node];
  } else if([type isEqualToString:@"set"]) {
    
  }
  /* Conversion */
  else if([type isEqualToString:@"value"]) {
    return [self evalBlockWithAnimatedNode:node];
  } else if ([type isEqualToString:@"number"]) {
    return ^ { return (CGFloat)[node[@"value"] floatValue]; };
  }
  return ^{ return (CGFloat)0.0f; };
}


- (evalBlock) evalBlockWithAnimatedNode:(NSDictionary*)node {
  NSNumber* tag = node[@"tag"];
  RCTValueAnimatedNode* animatedNode = (RCTValueAnimatedNode*)self.manager.animationNodes[tag];
  return ^ {
    return animatedNode.value;
  };
}

- (evalBlock) evalBlockWithCondition:(NSDictionary*)op {
  evalBlock evalExpr = [self evalBlockWithNode:op[@"expr"]];
  evalBlock evalTrue = [self evalBlockWithNode:op[@"ifNode"]];
  evalBlock evalFalse = [self evalBlockWithNode:op[@"elseNode"]];
  return ^{
    CGFloat cond = evalExpr();
    if(cond == TRUE) {
      return evalTrue();
    } else {
      return evalFalse();
    }
  };
}

- (evalBlock) evalBlockWithOperator:(NSDictionary*)op reducer:(evalOpReducer)reducer {
  evalBlock evalLeft = [self evalBlockWithNode:op[@"left"]];
  evalBlock evalRight = [self evalBlockWithNode:op[@"right"]];
  return ^ {
    return reducer(evalLeft(), evalRight());
  };
}

- (evalBlock) evalBlockWithSingleOperator:(NSDictionary*)op reducer:(evalSingleOpReducer)reducer {
  evalBlock evalV = [self evalBlockWithNode:op[@"v"]];
  return ^ {
    return reducer(evalV());
  };
}

- (evalBlock) evalBlockWithMultiOperator:(NSDictionary*)op reducer:(evalMultipOpReducer)reducer {
  evalBlock evalA = [self evalBlockWithNode:op[@"a"]];
  evalBlock evalB = [self evalBlockWithNode:op[@"b"]];
  NSArray* others = op[@"others"];
  NSMutableArray<evalBlock>* evalOthers = [[NSMutableArray alloc] init];
  for(int i=0; i<[others count]; i++) {
    [evalOthers addObject:[self evalBlockWithNode:others[i]]];
  }
  
  return ^ {
    CGFloat acc = reducer(evalA(), evalB());
    for(int i=0; i<[evalOthers count]; i++) {
      acc = reducer(acc, evalOthers[i]());
    }
    return acc;
  };
}

@end
