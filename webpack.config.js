const webpack = require("webpack");
const Path = require("path");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");

module.exports = {
  target: "web",
  output: {
    chunkFilename: "[name].[contenthash].bundle.js",
    clean: true
  },
  devServer: {
    allowedHosts: "all",
    port: 8400,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type, Accept",
      "Access-Control-Allow-Methods": "POST"
    }
  },
  mode: "development",
  devtool: "source-map",
  optimization: {
    splitChunks: {
      chunks: "all"
    }
  },
  plugins: [
    new CopyWebpackPlugin({
      patterns: [
        {
          from: Path.join(__dirname, "configuration.js"),
          to: Path.join(__dirname, "dist", "configuration.js")
        }
      ]
    }),
    new HtmlWebpackPlugin({
      title: "Eluvio Ingest App",
      template: Path.join(__dirname, "src", "index.html"),
      inject: "body",
      cache: false,
      filename: "index.html",
      favicon: "node_modules/elv-components-js/src/icons/favicon.png"
    }),
    new webpack.ProvidePlugin({
      process: "process/browser"
    })
  ],
  resolve: {
    alias: {
      "process": "process/browser",
      Assets: Path.resolve(__dirname, "src/static"),
      Components: Path.resolve(__dirname, "src/components"),
      Stores: Path.resolve(__dirname, "src/stores"),
      Utils: Path.resolve(__dirname, "src/utils"),
      // Force webpack to use *one* copy of bn.js instead of 8
      "bn.js": Path.resolve(Path.join(__dirname, "node_modules", "bn.js")),
      "@eluvio/elv-client-js$": "@eluvio/elv-client-js/dist/ElvClient-min.js"
    },
    extensions: [".js", ".jsx", ".scss", ".png", ".svg"],
    fallback: {
      "fs": false
    }
  },
  module: {
    rules: [
      {
        test: /\.jsx?$/,
        exclude: /node_modules\/(?!elv-components-js)/,
        use: {
          loader: "babel-loader",
          options: {
            presets: [
              ["@babel/preset-env", { targets: "defaults" }],
              ["@babel/preset-react", {"runtime": "automatic"}]
            ]
          },
        }
      },
      {
        test: /\.(css|scss)$/,
        use: [
          "style-loader",
          "css-loader",
          "sass-loader"
        ]
      },
      {
        test: /\.svg$/,
        loader: "svg-inline-loader"
      },
      {
        test: /\.(woff2?|ttf)$/i,
        loader: "file-loader",
        type: "javascript/auto"
      },
      {
        test: /\.(gif|png|jpe?g)$/i,
        use: [
          "file-loader",
          {
            loader: "image-webpack-loader"
          }
        ],
        type: "javascript/auto"
      },
      {
        test: /\.(txt|bin|abi)$/i,
        loader: "raw-loader",
        type: "javascript/auto"
      },
      {
        test: /\.ya?ml$/,
        type: "json",
        use: "yaml-loader"
      }
    ]
  }
};
