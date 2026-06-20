// Custom jest resolver for the `ui` project. jest allows a single resolver, and jest-expo already
// needs the React Native one (@react-native/jest-preset). Reanimated 4 / react-native-worklets,
// however, must resolve to their NON-native files under jest or worklets throws "Native part of
// Worklets doesn't seem to be initialized". So we apply react-native-worklets' own trick — drop the
// `*.native.*` extensions for worklets requests — then delegate to the RN resolver for everything.
const rnResolver = require('@react-native/jest-preset/jest/resolver');

/** @type {import('jest-resolve').SyncResolver} */
module.exports = (request, options) => {
  if (
    options.basedir.includes('react-native-worklets') ||
    request.includes('react-native-worklets')
  ) {
    options = {
      ...options,
      extensions: options.extensions?.filter((ext) => !ext.includes('native')),
    };
  }
  return rnResolver(request, options);
};
