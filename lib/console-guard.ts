import { isDevelopment } from './env';

// Silence diagnostic logging in preview/production builds so patient PII and
// request payloads (logged via console.log throughout the data layer) never
// reach on-device release logs. console.warn / console.error are preserved for
// real problems. Imported first at the app root (app/_layout.tsx); local
// console.log debugging keeps working in development.
if (!isDevelopment) {
  const noop = () => {};
  console.log = noop;
  console.info = noop;
  console.debug = noop;
}
