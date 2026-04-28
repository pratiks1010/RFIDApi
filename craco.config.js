const path = require("path");

module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      webpackConfig.ignoreWarnings = [
        ...(webpackConfig.ignoreWarnings || []),
        (warning) =>
          typeof warning?.message === "string" &&
          warning.message.includes("Failed to parse source map") &&
          warning.message.includes(
            `${path.sep}node_modules${path.sep}face-api.js${path.sep}`
          ),
      ];

      return webpackConfig;
    },
  },
};
