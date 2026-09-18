// babel-preset-taro 更多选项和默认值：
// https://docs.taro.zone/docs/next/babel-config
module.exports = {
  presets: [
    ['taro', {
      framework: 'react',
      ts: true,
      compiler: 'webpack5',
      // 不指定时 babel 会读 package.json 的 browserslist，那套目标太新，
      // 会把可选链 `?.` 原样留在产物里，微信开发者工具上传时报
      // 「invalid file: common.js SyntaxError: Unexpected token .」。
      targets: {
        chrome: '53',
        ios: '9',
      },
    }]
  ]
}
