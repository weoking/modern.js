import fs from 'fs';
import {
  path,
  applyOptionsChain,
  isProd,
  isUseSSRBundle,
  SERVER_BUNDLE_DIRECTORY,
  upath,
} from '@modern-js/utils';
import nodeExternals from 'webpack-node-externals';
import { mergeRegex } from '../utils/mergeRegex';
import { getSourceIncludes } from '../utils/getSourceIncludes';
import { BaseWebpackConfig } from './base';
import { JS_RESOLVE_EXTENSIONS } from '@/utils/constants';

class NodeWebpackConfig extends BaseWebpackConfig {
  get externalsAllowlist() {
    const includes = getSourceIncludes(this.appDirectory, this.options);
    return [
      (name: string) => {
        const ext = path.extname(name);

        return (
          name.includes('@modern-js/') ||
          (ext !== '' && !JS_RESOLVE_EXTENSIONS.includes(ext))
        );
      },
      includes.length && mergeRegex(...includes),
    ].filter(Boolean);
  }

  name() {
    this.chain.name('server');
  }

  devtool() {
    this.chain.devtool(false);
  }

  output() {
    super.output();
    this.chain.output
      .libraryTarget('commonjs2')
      .filename(`${SERVER_BUNDLE_DIRECTORY}/[name].js`);

    this.chain.output.delete('chunkFilename');
  }

  optimization() {
    super.optimization();
    this.chain.optimization.minimize(false);
    this.chain.optimization.splitChunks(false as any).runtimeChunk(false);
  }

  loaders() {
    const loaders = super.loaders();
    // css & css modules
    if (loaders.oneOfs.has('css')) {
      loaders.oneOf('css').uses.delete('mini-css-extract');
    }

    loaders
      .oneOf('css-modules')
      .uses.delete('mini-css-extract')
      .end()
      .use('css')
      .options({
        sourceMap: isProd() && !this.options.output?.disableSourceMap,
        importLoaders: 1,
        modules: {
          localIdentName: this.options.output
            ? this.options.output.cssModuleLocalIdentName!
            : '',
          exportLocalsConvention: 'camelCase',
          exportOnlyLocals: true,
        },
      });

    const babelOptions = loaders.oneOf('js').use('babel').get('options');

    loaders
      .oneOf('js')
      .use('babel')
      .options({
        ...babelOptions,
        presets: [
          [
            upath.normalizeSafe(require.resolve('@modern-js/babel-preset-app')),
            {
              appDirectory: this.appDirectory,
              target: 'server',
              useLegacyDecorators: !this.options.output?.enableLatestDecorators,
              useBuiltIns: false,
              chain: this.babelChain,
              styledCompontents: applyOptionsChain(
                {
                  pure: true,
                  displayName: true,
                  ssr: isUseSSRBundle(this.options),
                  transpileTemplateLiterals: true,
                },
                (this.options.tools as any)?.styledComponents,
              ),
            },
          ],
        ],
      });

    // TODO: ts-loader

    return loaders;
  }

  plugins() {
    super.plugins();
  }

  resolve() {
    super.resolve();
    for (const ext of [
      '.node.js',
      '.node.jsx',
      '.node.ts',
      '.node.tsx',
    ].reverse()) {
      this.chain.resolve.extensions.prepend(ext);
    }
    this.chain.resolve.mainFields.clear().add('main');
  }

  config() {
    const config = super.config();

    config.target = 'node';

    // dsiable sourcemap
    config.devtool = false;

    config.externals = config.externals || [];

    if (!Array.isArray(config.externals)) {
      config.externals = [config.externals].filter(Boolean);
    }

    config.resolve?.modules?.forEach(dir => {
      if (fs.existsSync(dir)) {
        (config.externals as any[]).push(
          nodeExternals({
            allowlist: this.externalsAllowlist as any,
            modulesDir: dir,
          }),
        );
      }
    });

    // ssr bundle use utils api, but can't treeshaking.
    // may be we can add '@modern-js/' or allowlist packages into webpack bundle
    config.externals.push('@modern-js/utils');
    return config;
  }
}

export { NodeWebpackConfig };
