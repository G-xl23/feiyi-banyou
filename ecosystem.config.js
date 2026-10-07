/**
 * PM2 进程配置 —— 推荐的公网部署方式（对不熟悉运维的人最友好）
 *
 * 常用命令（在项目根目录执行）：
 *   pm2 start ecosystem.config.js    # 启动
 *   pm2 logs feiyi-banyou            # 实时日志
 *   pm2 restart feiyi-banyou         # 改完 server/.env 后重启生效
 *   pm2 status                       # 查看运行状态
 *   pm2 stop feiyi-banyou            # 停止
 *   pm2 save && pm2 startup          # 保存进程列表并配置开机自启
 */
module.exports = {
  apps: [
    {
      name: 'feiyi-banyou',
      script: 'server/src/server.js',
      // cwd 固定为项目根目录，保证 server/src/server.js 里的相对路径解析正确
      cwd: __dirname,
      // 单实例即可：应用本身无状态，SSE 长连接由单进程处理最省心
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      // 内存超过 400M 自动重启，避免异常增长拖垮小内存服务器
      max_memory_restart: '400M',
      // server/.env 由应用自行加载（内置零依赖解析），此处只放运行期基础变量；
      // 若系统环境变量已存在同名项，应用会以系统环境变量为准。
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      out_file: 'logs/pm2-out.log',
      error_file: 'logs/pm2-err.log',
      merge_logs: true,
      // 日志加时间戳，便于和页面上的「耗时 xx ms」对照排查
      time: true
    }
  ]
};
