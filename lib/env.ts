import Constants from 'expo-constants';

export type AppEnv = 'development' | 'staging' | 'production';

export const APP_ENV: AppEnv =
  (Constants.expoConfig?.extra?.appEnv as AppEnv) || 'development';

export const isProduction = APP_ENV === 'production';
export const isStaging = APP_ENV === 'staging';
export const isDevelopment = APP_ENV === 'development';
