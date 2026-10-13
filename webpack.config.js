const path = require('path');

// Bundles scenario 3 (which uses the PILOTS ODRL Evaluator) for the browser, as in the ODRL Evaluator Demo.
module.exports = {
    mode: 'development',
    entry: './src/js/scenario3.js',
    output: {
        filename: 'scenario3.bundle.js',
        path: path.resolve(__dirname, 'src', 'dist'),
    },
    devServer: {
        static: { directory: path.join(__dirname, 'src') },
        port: 8080,
    },
    resolve: {
        // Node.js built-ins used by the evaluator's dependencies on Node.js-only code paths
        fallback: { fs: false, crypto: false, path: false, os: false, stream: false, perf_hooks: false },
    },
};