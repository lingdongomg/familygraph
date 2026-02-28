/**
 * 服务器配置
 *
 * 开发时使用本地地址，部署后修改为正式域名（需 HTTPS）
 * 微信小程序正式版要求域名已在公众平台配置白名单
 */

module.exports = {
  // 后端 API 基础地址（不含尾部斜杠）
  // 开发环境：http://localhost:8080
  // 生产环境：https://yourdomain.com
  BASE_URL: 'http://localhost:8080'
}
