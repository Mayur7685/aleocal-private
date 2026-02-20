// CRACO configuration for AleoCal with Aleo SDK
// Handles WASM and web workers properly

const path = require('path');

module.exports = {
  webpack: {
    configure: (webpackConfig, { env, paths }) => {
      // Handle WASM files
      webpackConfig.experiments = {
        ...webpackConfig.experiments,
        asyncWebAssembly: true,
        syncWebAssembly: true,
        topLevelAwait: true,
      };

      // Add rule for WASM files
      webpackConfig.module.rules.push({
        test: /\.wasm$/,
        type: 'webassembly/async',
      });

      // Configure resolve for WASM packages
      webpackConfig.resolve = {
        ...webpackConfig.resolve,
        fallback: {
          ...webpackConfig.resolve?.fallback,
          fs: false,
          path: false,
          crypto: false,
        },
      };

      // Handle @provablehq/wasm package
      // The 'wbg' imports are inline WASM glue code
      webpackConfig.module.rules.push({
        test: /\.js$/,
        include: /node_modules\/@provablehq/,
        resolve: {
          fullySpecified: false,
        },
      });

      // Exclude Aleo SDK workers from minification
      if (env === 'production') {
        const terserPlugin = webpackConfig.optimization.minimizer.find(
          (plugin) => plugin.constructor.name === 'TerserPlugin'
        );

        if (terserPlugin) {
          terserPlugin.options.exclude = [
            /worker\..*\.js$/,
            /\.wasm$/,
            /@provablehq/,
          ];
        }
      }

      // Handle web workers
      webpackConfig.module.rules.push({
        test: /\.worker\.(js|ts)$/,
        use: { loader: 'worker-loader' },
      });

      return webpackConfig;
    },
  },
};
