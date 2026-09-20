export default defineAppConfig({
  pages: [
    'pages/today/index',
    'pages/plan/index',
    'pages/analysis/index',
    'pages/me/index',
    'pages/log/index'
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#F5F1E4',
    navigationBarTitleText: '饮食日记',
    navigationBarTextStyle: 'black',
    backgroundColor: '#F5F1E4'
  },
  tabBar: {
    // 自己画：原生 tabBar 改不了形状，做不出网页版那条不规则胶囊浮岛
    custom: true,
    color: '#5a5d58',
    selectedColor: '#2c2e2a',
    backgroundColor: '#F5F1E4',
    borderStyle: 'white',
    list: [
      {
        pagePath: 'pages/today/index',
        text: '今日',
        iconPath: 'assets/tabbar/today-off.png',
        selectedIconPath: 'assets/tabbar/today-on.png'
      },
      {
        pagePath: 'pages/plan/index',
        text: '推荐',
        iconPath: 'assets/tabbar/plan-off.png',
        selectedIconPath: 'assets/tabbar/plan-on.png'
      },
      {
        pagePath: 'pages/analysis/index',
        text: '分析',
        iconPath: 'assets/tabbar/analysis-off.png',
        selectedIconPath: 'assets/tabbar/analysis-on.png'
      },
      {
        pagePath: 'pages/me/index',
        text: '我的',
        iconPath: 'assets/tabbar/me-off.png',
        selectedIconPath: 'assets/tabbar/me-on.png'
      }
    ]
  }
})
