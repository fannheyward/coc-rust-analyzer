/* eslint-disable @typescript-eslint/no-var-requires */
'use strict';

const fs = require('fs');
const { execSync } = require('child_process');
const packageJson = require('./package.json');
const coc_ra_config = require('./coc-rust-analyzer-configurations.json');

const not_supported = [
  'rust-analyzer.hoverActions.debug',
  'rust-analyzer.hoverActions.gotoTypeDef',
  'rust-analyzer.hoverActions.implementations',
  'rust-analyzer.hoverActions.run',
  'rust-analyzer.inlayHints.parameterHints',
  'rust-analyzer.lens.debug',
];

let schema = execSync('rust-analyzer --print-config-schema', { encoding: 'utf8' });
schema = JSON.parse(schema);

Object.keys(schema).forEach((k) => {
  if (!not_supported.includes(k)) {
    coc_ra_config[k] = schema[k];
  }
});

packageJson.contributes.configuration.properties = coc_ra_config;
fs.writeFileSync('./package.json', JSON.stringify(packageJson, null, 2) + '\n');
