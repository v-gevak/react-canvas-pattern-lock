module.exports = {
  "stories": ["../src/**/*.stories.@(js|jsx|ts|tsx)"],
  "addons": ["@storybook/addon-links", "@storybook/addon-essentials", "@storybook/preset-create-react-app", "@storybook/addon-mdx-gfm"],
  "framework": {
    "name": "@storybook/react-webpack5",
    "options": {}
  },
  "docs": {
    autodocs: "tag"
  },
  "staticDirs": ["../public"],
  webpackFinal: config => {
    config.plugins = config.plugins.filter(p => p.constructor.name !== 'ESLintWebpackPlugin');
    return config;
  }
};
