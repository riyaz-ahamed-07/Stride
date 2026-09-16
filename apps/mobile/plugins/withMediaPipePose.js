/**
 * Expo config plugin — wires munishbp/react-native-mediapipe-pose-plugin into prebuild.
 * After changing this file: npm run setup:pose-models && npm run prebuild:clean
 */
const fs = require("fs");
const path = require("path");
const {
  withAppBuildGradle,
  withMainApplication,
  withPodfile,
  withXcodeProject,
  withDangerousMod,
  IOSConfig,
} = require("@expo/config-plugins");

const PLUGIN_ROOT = path.join(
  require.resolve("react-native-mediapipe-pose-plugin/package.json"),
  "..",
);
const APP_PACKAGE = "clinic.stride.app";

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function copyFile(src, dest) {
  if (!fs.existsSync(src)) {
    console.warn(`[withMediaPipePose] missing ${src}`);
    return false;
  }
  ensureDir(path.dirname(dest));
  fs.copyFileSync(src, dest);
  return true;
}

function patchSwiftHeader(mContent, appName) {
  return mContent.replace(/#import\s+"[^"]+-Swift\.h"/, `#import "${appName}-Swift.h"`);
}

function withMediaPipePoseModels(config) {
  return withDangerousMod(config, [
    "android",
    async (cfg) => {
      const projectRoot = cfg.modRequest.projectRoot;
      const assetsDir = path.join(projectRoot, "assets", "models");
      const modelSrc = path.join(assetsDir, "pose_landmarker_full.task");
      const modelDest = path.join(
        cfg.modRequest.platformProjectRoot,
        "app",
        "src",
        "main",
        "assets",
        "pose_landmarker_full.task",
      );
      if (fs.existsSync(modelSrc)) {
        copyFile(modelSrc, modelDest);
      } else {
        console.warn(
          "[withMediaPipePose] Run npm run setup:pose-models before prebuild to bundle the pose model.",
        );
      }
      return cfg;
    },
  ]);
}

function withMediaPipePoseAndroid(config) {
  config = withAppBuildGradle(config, (cfg) => {
    let contents = cfg.modResults.contents;
    if (!contents.includes("com.google.mediapipe:tasks-vision")) {
      contents = contents.replace(
        /dependencies\s*\{/,
        `dependencies {
    implementation 'com.google.mediapipe:tasks-vision:0.10.29'`,
      );
    }
    if (!contents.includes("noCompress += \"task\"")) {
      contents = contents.replace(
        /androidResources\s*\{/,
        `androidResources {
        noCompress += "task"`,
      );
    }
    cfg.modResults.contents = contents;
    return cfg;
  });

  config = withDangerousMod(config, [
    "android",
    async (cfg) => {
      const projectRoot = cfg.modRequest.projectRoot;
      const androidRoot = cfg.modRequest.platformProjectRoot;
      const pkgPath = APP_PACKAGE.split(".").join(path.sep);
      const destDir = path.join(
        androidRoot,
        "app",
        "src",
        "main",
        "java",
        pkgPath,
        "poselandmarker",
      );
      const srcKt = path.join(
        PLUGIN_ROOT,
        "android",
        "src",
        "main",
        "java",
        "com",
        "poselandmarker",
        "PoseLandmarkerFrameProcessorPlugin.kt",
      );
      const destKt = path.join(destDir, "PoseLandmarkerFrameProcessorPlugin.kt");
      if (copyFile(srcKt, destKt)) {
        let kt = fs.readFileSync(destKt, "utf8");
        kt = kt.replace(
          /^package\s+com\.poselandmarker/m,
          `package ${APP_PACKAGE}.poselandmarker`,
        );
        fs.writeFileSync(destKt, kt);
      }
      return cfg;
    },
  ]);

  config = withMainApplication(config, (cfg) => {
    let contents = cfg.modResults.contents;
    const importPlugin = `import ${APP_PACKAGE}.poselandmarker.PoseLandmarkerFrameProcessorPlugin`;
    const importRegistry = `import com.mrousavy.camera.frameprocessors.FrameProcessorPluginRegistry`;

    if (!contents.includes(importPlugin)) {
      contents = contents.replace(
        /^package\s+[^\n]+\n/,
        (match) => `${match}${importPlugin}\n${importRegistry}\n`,
      );
    }

    if (!contents.includes('FrameProcessorPluginRegistry.addFrameProcessorPlugin("poseLandmarker"')) {
      const companion = `
  companion object {
    init {
      FrameProcessorPluginRegistry.addFrameProcessorPlugin("poseLandmarker") { proxy, options ->
        PoseLandmarkerFrameProcessorPlugin(proxy, options)
      }
    }
  }
`;
      if (contents.includes("companion object")) {
        contents = contents.replace(/companion object\s*\{/, `companion object {${companion.trim()}`);
      } else {
        contents = contents.replace(
          /class MainApplication[^{]+\{/,
          (m) => `${m}${companion}`,
        );
      }
    }

    cfg.modResults.contents = contents;
    return cfg;
  });

  return config;
}

function withMediaPipePoseIos(config) {
  config = withPodfile(config, (cfg) => {
    let contents = cfg.modResults.contents;
    if (!contents.includes("MediaPipeTasksVision")) {
      contents = contents.replace(
        /use_expo_modules!/,
        `pod 'MediaPipeTasksVision', '~> 0.10.14'\n  use_expo_modules!`,
      );
    }

    if (!contents.includes("MediaPipeTasksVision.xcframework/ios-arm64")) {
      const snippet = `
  installer.pods_project.targets.each do |target|
    target.build_configurations.each do |bc|
      bc.build_settings['CLANG_CXX_LANGUAGE_STANDARD'] = 'c++20'
      bc.build_settings['CLANG_CXX_LIBRARY'] = 'libc++'
    end
  end

  xcf_vision = '\${PODS_ROOT}/MediaPipeTasksVision/frameworks/MediaPipeTasksVision.xcframework'
  xcf_common = '\${PODS_ROOT}/MediaPipeTasksCommon/frameworks/MediaPipeTasksCommon.xcframework'
  Dir.glob(File.join(installer.sandbox.root, 'Target Support Files', 'Pods-*', '*.xcconfig')).each do |xcconfig_path|
    config = File.read(xcconfig_path)
    config = config.gsub('-l"MediaPipeTasksCommon"', '-framework "MediaPipeTasksCommon"')
    config = config.gsub('-l"MediaPipeTasksVision"', '-framework "MediaPipeTasksVision"')
    unless config.include?('MediaPipeTasksVision.xcframework/ios-arm64')
      config += "\\nFRAMEWORK_SEARCH_PATHS = \$(inherited) \\"#{xcf_vision}/ios-arm64\\" \\"#{xcf_common}/ios-arm64\\""
    end
    File.write(xcconfig_path, config)
  end
`;
      contents = contents.replace(
        /post_install do \|installer\|/,
        `post_install do |installer|${snippet}`,
      );
    }

    cfg.modResults.contents = contents;
    return cfg;
  });

  config = withDangerousMod(config, [
    "ios",
    async (cfg) => {
      const iosRoot = cfg.modRequest.platformProjectRoot;
      const projectRoot = cfg.modRequest.projectRoot;
      const appName = IOSConfig.XcodeUtils.getProjectName(iosRoot);
      const appDir = path.join(iosRoot, appName);

      const files = [
        ["PoseLandmarkerPlugin.swift", "PoseLandmarkerPlugin.swift"],
        ["PoseLandmarkerPlugin.m", "PoseLandmarkerPlugin.m"],
      ];
      for (const [srcName, destName] of files) {
        copyFile(path.join(PLUGIN_ROOT, "ios", srcName), path.join(appDir, destName));
      }

      const modelSrc = path.join(projectRoot, "assets", "models", "pose_landmarker_full.task");
      if (fs.existsSync(modelSrc)) {
        copyFile(modelSrc, path.join(appDir, "pose_landmarker_full.task"));
      }

      const mPath = path.join(appDir, "PoseLandmarkerPlugin.m");
      if (fs.existsSync(mPath)) {
        let m = fs.readFileSync(mPath, "utf8");
        m = patchSwiftHeader(m, appName);
        fs.writeFileSync(mPath, m);
      }

      const bridging = path.join(appDir, `${appName}-Bridging-Header.h`);
      const imports = `#import <VisionCamera/FrameProcessorPlugin.h>
#import <VisionCamera/FrameProcessorPluginRegistry.h>
#import <VisionCamera/Frame.h>
#import <VisionCamera/VisionCameraProxyHolder.h>
`;
      if (fs.existsSync(bridging)) {
        let bh = fs.readFileSync(bridging, "utf8");
        if (!bh.includes("FrameProcessorPlugin.h")) {
          fs.writeFileSync(bridging, `${bh.trim()}\n${imports}`);
        }
      } else {
        fs.writeFileSync(bridging, imports);
      }

      return cfg;
    },
  ]);

  config = withXcodeProject(config, (cfg) => {
    const project = cfg.modResults;
    const appName = project.getFirstTarget().firstTarget.name;
    const group = project.findPBXGroupKey({ name: appName });
    const files = ["PoseLandmarkerPlugin.swift", "PoseLandmarkerPlugin.m", "pose_landmarker_full.task"];
    for (const file of files) {
      if (!project.hasFile(`${appName}/${file}`)) {
        project.addSourceFile(`${appName}/${file}`, {}, group);
      }
    }
    return cfg;
  });

  return config;
}

function withMediaPipePose(config) {
  config = withMediaPipePoseModels(config);
  config = withMediaPipePoseAndroid(config);
  config = withMediaPipePoseIos(config);
  return config;
}

module.exports = withMediaPipePose;
