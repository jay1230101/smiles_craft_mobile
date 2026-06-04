/**
 * Dynamic Expo config — layers environment-specific values on top of app.json.
 * APP_ENV is set per build in eas.json. For local dev (`expo start`), it defaults to 'development'.
 */
const baseConfig = require('./app.json');

const APP_ENV = process.env.APP_ENV || 'development';

const NAME_SUFFIX = {
  development: ' (Dev)',
  staging: ' (Staging)',
  production: '',
};

const suffix = NAME_SUFFIX[APP_ENV] ?? NAME_SUFFIX.development;

module.exports = {
  expo: {
    ...baseConfig.expo,
    name: `${baseConfig.expo.name}${suffix}`,
    extra: {
      ...baseConfig.expo.extra,
      appEnv: APP_ENV,
    },
  },
};
