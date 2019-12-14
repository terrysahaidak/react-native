/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.react.animated;

import androidx.annotation.Nullable;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.JSApplicationIllegalArgumentException;
import com.facebook.react.bridge.JavaOnlyArray;
import com.facebook.react.bridge.JavaOnlyMap;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.ReadableMapKeySetIterator;
import com.facebook.react.bridge.ReadableType;
import com.facebook.react.bridge.UIManager;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.WritableNativeMap;
import com.facebook.react.uimanager.ReactStylesDiffMap;

import java.util.HashMap;
import java.util.Iterator;
import java.util.Map;

/**
 * Animated node that represents view properties. There is a special handling logic implemented for
 * the nodes of this type in {@link NativeAnimatedNodesManager} that is responsible for extracting a
 * map of updated properties, which can be then passed down to the view.
 */
/*package*/ class PropsAnimatedNode extends AnimatedNode {

  private int mConnectedViewTag = -1;
  private final NativeAnimatedNodesManager mNativeAnimatedNodesManager;
  private final UIManager mUIManager;
  private final Map<String, Integer> mPropNodeMapping;
  private final JavaOnlyMap mPropMap;

  private static void addProp(WritableMap propMap, String key, Object value) {
    if (value == null) {
      propMap.putNull(key);
    } else if (value instanceof Double) {
      propMap.putDouble(key, (Double) value);
    } else if (value instanceof Integer) {
      propMap.putInt(key, (int) value);
    } else if (value instanceof Number) {
      propMap.putDouble(key, ((Number) value).doubleValue());
    } else if (value instanceof Boolean) {
      propMap.putBoolean(key, (Boolean) value);
    } else if (value instanceof String) {
      propMap.putString(key, (String) value);
    } else if (value instanceof WritableArray) {
      propMap.putArray(key, (WritableArray)value);
    } else if (value instanceof WritableMap) {
      propMap.putMap(key, (WritableMap)value);
    } else {
      throw new IllegalStateException("Unknown type of animated value");
    }
  }

  PropsAnimatedNode(
      ReadableMap config,
      NativeAnimatedNodesManager nativeAnimatedNodesManager,
      UIManager uiManager) {
    ReadableMap props = config.getMap("props");
    ReadableMapKeySetIterator iter = props.keySetIterator();
    mPropNodeMapping = new HashMap<>();
    while (iter.hasNextKey()) {
      String propKey = iter.nextKey();
      int nodeIndex = props.getInt(propKey);
      mPropNodeMapping.put(propKey, nodeIndex);
    }
    mPropMap = new JavaOnlyMap();
    mNativeAnimatedNodesManager = nativeAnimatedNodesManager;
    mUIManager = uiManager;
  }

  public void connectToView(int viewTag) {
    if (mConnectedViewTag != -1) {
      throw new JSApplicationIllegalArgumentException(
          "Animated node " + mTag + " is " + "already attached to a view");
    }
    mConnectedViewTag = viewTag;
  }

  public void disconnectFromView(int viewTag) {
    if (mConnectedViewTag != viewTag) {
      throw new JSApplicationIllegalArgumentException(
          "Attempting to disconnect view that has "
              + "not been connected with the given animated node");
    }

    mConnectedViewTag = -1;
  }

  public void restoreDefaultValues() {
    ReadableMapKeySetIterator it = mPropMap.keySetIterator();
    while (it.hasNextKey()) {
      mPropMap.putNull(it.nextKey());
    }

    mUIManager.synchronouslyUpdateViewOnUIThread(mConnectedViewTag, mPropMap);
  }

  public final void updateView() {
    if (mConnectedViewTag == -1) {
      return;
    }
    JavaOnlyMap nativeProps = new JavaOnlyMap();

    for (Map.Entry<String, Integer> entry : mPropNodeMapping.entrySet()) {
      String key = entry.getKey();
      @Nullable AnimatedNode node = mNativeAnimatedNodesManager.getNodeById(entry.getValue());
      if (node == null) {
        throw new IllegalArgumentException("Mapped property node does not exists");
      } else if (node instanceof StyleAnimatedNode) {
        ((StyleAnimatedNode) node).collectViewUpdates(mPropMap, nativeProps);
      } else if (node instanceof ValueAnimatedNode) {
        Object animatedObject = ((ValueAnimatedNode) node).getAnimatedObject();
        if (animatedObject != null) {
          if (mNativeAnimatedNodesManager.uiProps.contains(key)) {
            addProp(mPropMap, key, animatedObject);
          } else {
            addProp(nativeProps, key, animatedObject);
          }
        } else {
          if (mNativeAnimatedNodesManager.uiProps.contains(key)) {
            mPropMap.putDouble(entry.getKey(), ((ValueAnimatedNode) node).getValue());
          } else {
            nativeProps.putDouble(key, ((ValueAnimatedNode) node).getValue());
          }
        }
      } else {
        throw new IllegalArgumentException(
            "Unsupported type of node used in property node " + node.getClass());
      }
    }

    if(mPropMap.keySetIterator().hasNextKey()) {
      mUIManager.synchronouslyUpdateViewOnUIThread(mConnectedViewTag, mPropMap);
    }

    if(nativeProps.keySetIterator().hasNextKey()) {
      mNativeAnimatedNodesManager.enqueueUpdateViewOnNativeThread(mConnectedViewTag, nativeProps);
    }
  }
}
