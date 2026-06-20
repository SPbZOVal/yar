/* eslint-disable */
// Lightweight Skia mock for screen tests: we only assert that the RN touch overlay dispatches
// store actions, not Skia visuals — so canvas primitives render as no-ops and matchFont is a stub.
jest.mock('@shopify/react-native-skia', () => {
  const React = require('react');
  const pass = ({ children }) => React.createElement(React.Fragment, null, children ?? null);
  const nope = () => null;
  return {
    Canvas: pass,
    Group: pass,
    Circle: nope,
    Line: nope,
    Rect: nope,
    RoundedRect: nope,
    Path: nope,
    Text: nope,
    matchFont: () => ({}),
    Skia: {},
  };
});
