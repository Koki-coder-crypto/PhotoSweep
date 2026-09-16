# decode-uri-component 0.5.0 CommonJS bridge

Upstream: https://github.com/SamVerschueren/decode-uri-component/tree/v0.5.0
Registry source: decode-uri-component@0.5.0 (npm tarball).
License: MIT, reproduced in `license`.

Only modification: `export default function decodeUriComponent` becomes `module.exports = function decodeUriComponent`. The decoding algorithm is unchanged. Expo Router 57 currently uses query-string 7, which calls this dependency through CommonJS. The original 0.2.2 dependency has GHSA-vcc3-ghjq-m6fr. Version 0.5.0 contains the upstream fix; a blind ESM override would change query-string's required API shape.

The root npm override selects this local, tracked package for both Metro and Node. Remove the bridge when Expo Router adopts a compatible patched dependency. Do not format or edit its algorithm independently. Preserve the upstream license when distributing it.
