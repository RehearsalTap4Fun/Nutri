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
    color: '#8a8c86',
    selectedColor: '#2c2e2a',
    backgroundColor: '#F5F1E4',
    borderStyle: 'white',
    list: [
      { pagePath: 'pages/today/index', text: '今日' },
      { pagePath: 'pages/plan/index', text: '计划' },
      { pagePath: 'pages/analysis/index', text: '分析' },
      { pagePath: 'pages/me/index', text: '我的' }
    ]
  }
})
