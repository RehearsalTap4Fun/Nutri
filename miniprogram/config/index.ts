import path from 'node:path'
import { defineConfig, type UserConfigExport } from '@tarojs/cli'
import TsconfigPathsPlugin from 'tsconfig-paths-webpack-plugin'
import devConfig from './dev'
import prodConfig from './prod'

/** 与网页版共用的源码目录 */
const SHARED_SRC = path.resolve(__dirname, '..', '..', 'src')

/**
 * node_modules 默认不过 babel。noble 的源码里有可选链，不转换的话会原样进产物，
 * 开发者工具上传时报 invalid file。同步用的加密就依赖它，所以显式纳入编译。
 */
const NOBLE = [
  path.resolve(__dirname, '..', 'node_modules', '@noble'),
  path.resolve(__dirname, '..', '..', 'node_modules', '@noble'),
]

// https://taro-docs.jd.com/docs/next/config#defineconfig-辅助函数

export default defineConfig<'webpack5'>(async (merge, { command, mode }) => {
  const baseConfig: UserConfigExport<'webpack5'> = {
    projectName: 'nutri-miniprogram',
    date: '2026-9-18',
    designWidth: 750,
    deviceRatio: {
      640: 2.34 / 2,
      750: 1,
      375: 2,
      828: 1.81 / 2
    },
    sourceRoot: 'src',
    outputRoot: 'dist',
    // 与网页版共用 core / data / store 的同一份源码（位于本目录之外）
    alias: {
      '@': path.resolve(__dirname, '..', 'src'),
      '@core': path.resolve(SHARED_SRC, 'core'),
      '@data': path.resolve(SHARED_SRC, 'data'),
      '@store': path.resolve(SHARED_SRC, 'store'),
      '@webui': path.resolve(SHARED_SRC, 'ui'),
      '@sync': path.resolve(SHARED_SRC, 'sync')
    },
    compiler: 'webpack5',
    plugins: [
      "@tarojs/plugin-generator"
    ],
    defineConstants: {
    },
    copy: {
      patterns: [
        // 像素猫图层按真实文件进包，运行时用 `/assets/pixelpack/xxx.png` 加载
        { from: 'src/assets/pixelpack/', to: 'dist/assets/pixelpack/' },
        // tabBar 只吃位图，图标由 scripts/genTabIcons.mjs 从网页版同一组 SVG 路径生成
        { from: 'src/assets/tabbar/', to: 'dist/assets/tabbar/' },
        // 陆地岸线，由 scripts/genLandEdge.mjs 从网页版同一段 SVG 路径渲染
        { from: 'src/assets/land/', to: 'dist/assets/land/' }
      ],
      options: {
      }
    },
    framework: 'react',
    cache: {
      enable: false // Webpack 持久化缓存配置，建议开启。默认配置请参考：https://docs.taro.zone/docs/config-detail#cache
    },
    mini: {
      // core / data / store 在 sourceRoot 之外，要显式交给 babel 处理
      compile: {
        include: [SHARED_SRC, ...NOBLE]
      },
      // Terser 默认按现代语法压缩，会把 babel 已经降级的 `a && a.b` 重新写回
      // 可选链 `a?.b`，导致开发者工具上传时报
      // 「invalid file: common.js SyntaxError: Unexpected token .」。

      postcss: {
        pxtransform: {
          enable: true,
          config: {

          }
        },
        cssModules: {
          enable: false, // 默认为 false，如需使用 css modules 功能，则设为 true
          config: {
            namingPattern: 'module', // 转换模式，取值为 global/module
            generateScopedName: '[name]__[local]___[hash:base64:5]'
          }
        }
      },
      webpackChain(chain) {
        chain.resolve.plugin('tsconfig-paths').use(TsconfigPathsPlugin)
      }
    },
    h5: {
      compile: {
        include: [SHARED_SRC, ...NOBLE]
      },
      publicPath: '/',
      staticDirectory: 'static',
      output: {
        filename: 'js/[name].[hash:8].js',
        chunkFilename: 'js/[name].[chunkhash:8].js'
      },
      miniCssExtractPluginOption: {
        ignoreOrder: true,
        filename: 'css/[name].[hash].css',
        chunkFilename: 'css/[name].[chunkhash].css'
      },
      postcss: {
        autoprefixer: {
          enable: true,
          config: {}
        },
        cssModules: {
          enable: false, // 默认为 false，如需使用 css modules 功能，则设为 true
          config: {
            namingPattern: 'module', // 转换模式，取值为 global/module
            generateScopedName: '[name]__[local]___[hash:base64:5]'
          }
        }
      },
      webpackChain(chain) {
        chain.resolve.plugin('tsconfig-paths').use(TsconfigPathsPlugin)
      }
    },
    rn: {
      appName: 'taroDemo',
      postcss: {
        cssModules: {
          enable: false, // 默认为 false，如需使用 css modules 功能，则设为 true
        }
      }
    }
  }


  if (process.env.NODE_ENV === 'development') {
    // 本地开发构建配置（不混淆压缩）
    return merge({}, baseConfig, devConfig)
  }
  // 生产构建配置（默认开启压缩混淆等）
  return merge({}, baseConfig, prodConfig)
})
