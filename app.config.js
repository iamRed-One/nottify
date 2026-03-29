module.exports = ({ config }) => ({
  ...config,
  ios: {
    ...config.ios,
    ...(process.env.GOOGLE_SERVICES_INFO_PLIST
      ? {
          googleServicesFile: process.env.GOOGLE_SERVICES_INFO_PLIST,
        }
      : {}),
  },
  android: {
    ...config.android,
    googleServicesFile:
      process.env.GOOGLE_SERVICES_JSON || './google-services.json',
  },
});