// 自定义 tabBar 必须声明成自定义组件。definePageConfig 的类型里没有 component 这一项，
// 但小程序要求它存在，所以这里用 as 放行。
export default definePageConfig({
  component: true,
} as unknown as Parameters<typeof definePageConfig>[0])
