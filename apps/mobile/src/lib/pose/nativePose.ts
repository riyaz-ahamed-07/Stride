import { Platform } from "react-native";
import { VisionCameraProxy } from "react-native-vision-camera";

/** True when the native poseLandmarker frame processor is linked in the dev client. */
export function isNativePoseAvailable(): boolean {
  try {
    const plugin = VisionCameraProxy.initFrameProcessorPlugin("poseLandmarker", {});
    return plugin != null;
  } catch {
    return false;
  }
}

export const NATIVE_POSE_ANDROID = Platform.OS === "android";
