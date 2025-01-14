/** @type {import('@modern-tools/app-tools').UserConfig} */
module.exports = {
  output: {
    assetPrefix: '../../',
  },
  dev: {
    assetPrefix: `https://localhost:8080/`,
  },
  runtime: {
    state: true,
    router: {
      supportHtml5History: process.env.NODE_ENV === 'development',
    },
  },
  electron: {
    builder: {
      baseConfig: {
        appId: 'com.bytedance.demo',
        // eslint-disable-next-line no-template-curly-in-string
        artifactName: 'demo_${env.VERSION}.${ext}',
        files: [
          {
            from: '.',
            to: '.',
            filter: ['!**/*.map', '!**/*.d.ts', '!*.log', '!*.lock'],
          },
        ],

        directories: {
          app: 'dist',
        },
      },
    },
  },
};
