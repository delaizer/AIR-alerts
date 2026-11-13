// Вимикає небезпечні можливості Electron у зібраному застосунку.
const path = require("path");
const { flipFuses, FuseVersion, FuseV1Options } = require("@electron/fuses");

exports.default = async (context) => {
  const { appOutDir, electronPlatformName, packager } = context;
  const name = packager.appInfo.productFilename;
  const exe =
    electronPlatformName === "darwin" ? path.join(appOutDir, `${name}.app`) :
    electronPlatformName === "win32" ? path.join(appOutDir, `${name}.exe`) :
    path.join(appOutDir, packager.executableName);
  await flipFuses(exe, {
    version: FuseVersion.V1,
    [FuseV1Options.RunAsNode]: false,
    [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
    [FuseV1Options.EnableNodeCliInspectArguments]: false,
    [FuseV1Options.EnableCookieEncryption]: true,
    [FuseV1Options.OnlyLoadAppFromAsar]: true,
  });
};
