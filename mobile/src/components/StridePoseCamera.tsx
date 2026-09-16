import { useMemo } from "react";
import type { StyleProp, ViewStyle } from "react-native";

import { isNativePoseAvailable } from "../lib/pose/nativePose";
import { DemoFigurePanel } from "./DemoFigurePanel";
import { NativePoseCamera } from "./NativePoseCamera";
import {
  PoseSkeletonCamera,
  type PoseMetricsPayload,
} from "./PoseSkeletonCamera";

export type { PoseMetricsPayload };

type Props = {
  facing: "front" | "back";
  recipeKey?: string | null;
  style?: StyleProp<ViewStyle>;
  onReady?: () => void;
  onError?: (message: string) => void;
  onMetrics?: (metrics: PoseMetricsPayload) => void;
};

/**
 * Prefers native Vision Camera + MediaPipe + Skia when the dev client includes
 * the pose plugin; falls back to inline WebView overlay otherwise.
 */
export function StridePoseCamera(props: Props) {
  const native = useMemo(() => isNativePoseAvailable(), []);

  if (native) {
    return <NativePoseCamera {...props} />;
  }

  return <PoseSkeletonCamera {...props} />;
}

export { DemoFigurePanel, NativePoseCamera, PoseSkeletonCamera };
