const resolve = require('@rollup/plugin-node-resolve');
const commonjs = require('@rollup/plugin-commonjs');
const json = require('@rollup/plugin-json');

module.exports = {
  input: 'src/index.js',
  output: [
    {
      file: 'dist/index.js',
      format: 'cjs',
      exports: 'auto'
    },
    {
      file: 'dist/index.esm.js',
      format: 'esm'
    }
  ],
  plugins: [
    json(), // Add JSON plugin to handle JSON imports
    resolve({
      preferBuiltins: true, // Prefer Node.js built-ins
      browser: false // We're building for Node.js
    }),
    commonjs({
      include: /node_modules/ // Only transform CommonJS modules in node_modules
    })
  ],
  external: [
    // Mark Node.js built-ins and peer dependencies as external
    'ethers',
    'winston', // Add winston as external dependency
    'fs', 
    'path',
    'crypto',
    'util',
    'events',
    'stream',
    'os',
    'url',
    'querystring',
    'assert',
    'buffer',
    'child_process',
    'cluster',
    'dgram',
    'dns',
    'domain',
    'http',
    'https',
    'net',
    'punycode',
    'readline',
    'repl',
    'string_decoder',
    'sys',
    'timers',
    'tls',
    'tty',
    'v8',
    'vm',
    'zlib'
  ]
};
