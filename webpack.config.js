const webpack = require("webpack");
const Path = require("path");
const autoprefixer = require("autoprefixer");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const BundleAnalyzerPlugin = require("webpack-bundle-analyzer").BundleAnalyzerPlugin;
const HtmlWebpackPlugin = require("html-webpack-plugin");
const TerserPlugin = require("terser-webpack-plugin");

module.exports = {
  entry: "./src/index.js",
  target: "web",
  output: {
    path: Path.resolve(__dirname, "dist"),
    filename: "[name].js",
    chunkFilename: "[name].[contenthash].bundle.js"
  },
  devServer: {
    disableHostCheck: true,
    inline: true,
    port: 8400,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type, Accept",
      "Access-Control-Allow-Methods": "POST"
    }
  },
  optimization: {
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          keep_classnames: true,
          keep_fnames: true
        }
      })
    ],
    splitChunks: {
      chunks: "all"
    }
  },
  node: {
    fs: "empty"
  },
  mode: "development",
  devtool: "eval-source-map",
  plugins: [
    new CopyWebpackPlugin([{
      from: Path.join(__dirname, "configuration.js"),
      to: Path.join(__dirname, "dist", "configuration.js")
    }]),
    new HtmlWebpackPlugin({
      title: "Eluvio Ingest App",
      template: Path.join(__dirname, "src", "index.html"),
      inject: "body",
      cache: false,
      filename: "index.html",
      inlineSource: ".(js|css)$",
      favicon: "node_modules/elv-components-js/src/icons/favicon.png"
    })
  ],
  mode: "development",
  resolve: {
    alias: {
      Assets: Path.resolve(__dirname, "src/static"),
      Components: Path.resolve(__dirname, "src/components"),
      Stores: Path.resolve(__dirname, "src/stores"),
      Utils: Path.resolve(__dirname, "src/utils"),
      // Force webpack to use *one* copy of bn.js instead of 8
      "bn.js": Path.resolve(Path.join(__dirname, "node_modules", "bn.js")),
      "@eluvio/elv-client-js$": "@eluvio/elv-client-js/dist/ElvClient-min.js"
    },
    extensions: [".js", ".jsx", ".scss", ".png", ".svg"],
  },
  module: {
    rules: [
      {
        test: /\.(css|scss)$/,
        use: [
          "style-loader",
          {
            loader: "css-loader",
            options: {
              importLoaders: 2
            }
          },
          {
            loader: "postcss-loader",
            options: {
              plugins: () => [autoprefixer({})]
            }
          },
          "sass-loader"
        ]
      },
      {
        test: /\.(js|mjs)$/,
        exclude: /node_modules\/(?!elv-components-js)/,
        loader: "babel-loader",
        options: {
          presets: ["@babel/preset-env", "@babel/preset-react", "babel-preset-mobx"],
          plugins: [
            ["@babel/plugin-proposal-private-property-in-object", { "loose": true }],
            ["@babel/plugin-proposal-private-methods", { "loose": true }],
            require("@babel/plugin-proposal-object-rest-spread"),
            require("@babel/plugin-transform-regenerator"),
            require("@babel/plugin-transform-runtime")
          ]
        }
      },
      {
        test: /\.svg$/,
        loader: "svg-inline-loader"
      },
      {
        test: /\.(gif|png|jpe?g)$/i,
        use: [
          "file-loader",
          {
            loader: "image-webpack-loader"
          },
        ],
      },
      {
        test: /\.(txt|bin|abi)$/i,
        loader: "raw-loader"
      }
    ]
  }
};
