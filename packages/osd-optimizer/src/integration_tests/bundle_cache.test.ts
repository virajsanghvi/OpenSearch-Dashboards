/*
 * SPDX-License-Identifier: Apache-2.0
 *
 * The OpenSearch Contributors require contributions made to
 * this file be licensed under the Apache-2.0 license or a
 * compatible open source license.
 *
 * Any modifications Copyright OpenSearch Contributors. See
 * GitHub history for details.
 */

/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import Path from 'path';

import cpy from 'cpy';
import del from 'del';
import { createAbsolutePathSerializer } from '@osd/dev-utils';

import { getHashes } from '../optimizer/get_hashes';
import { OptimizerConfig } from '../optimizer/optimizer_config';
import { allValuesFrom, Bundle } from '../common';
import { getBundleCacheEvent$ } from '../optimizer/bundle_cache';

const TMP_DIR = Path.resolve(__dirname, '../__fixtures__/__tmp__');
const MOCK_REPO_SRC = Path.resolve(__dirname, '../__fixtures__/mock_repo');
const MOCK_REPO_DIR = Path.resolve(TMP_DIR, 'mock_repo');

expect.addSnapshotSerializer({
  print: () => '<Bundle>',
  test: (v) => v instanceof Bundle,
});
expect.addSnapshotSerializer(createAbsolutePathSerializer(MOCK_REPO_DIR));

beforeEach(async () => {
  await del(TMP_DIR);
  await cpy('**/*', MOCK_REPO_DIR, {
    cwd: MOCK_REPO_SRC,
    parents: true,
    deep: Infinity,
  });
});

afterEach(async () => {
  await del(TMP_DIR);
});

it('emits "bundle cached" event when everything is updated', async () => {
  const config = OptimizerConfig.create({
    repoRoot: MOCK_REPO_DIR,
    pluginScanDirs: [],
    pluginPaths: [Path.resolve(MOCK_REPO_DIR, 'plugins/foo')],
    maxWorkerCount: 1,
  });
  const [bundle] = config.bundles;

  const optimizerCacheKey = 'optimizerCacheKey';
  const files = [
    Path.resolve(MOCK_REPO_DIR, 'plugins/foo/public/ext.ts'),
    Path.resolve(MOCK_REPO_DIR, 'plugins/foo/public/index.ts'),
    Path.resolve(MOCK_REPO_DIR, 'plugins/foo/public/lib.ts'),
  ];
  const hashes = await getHashes(files);
  const cacheKey = bundle.createCacheKey(files, hashes);

  bundle.cache.set({
    cacheKey,
    optimizerCacheKey,
    files,
    moduleCount: files.length,
    bundleRefExportIds: [],
  });

  const cacheEvents = await allValuesFrom(getBundleCacheEvent$(config, optimizerCacheKey));

  expect(cacheEvents).toMatchInlineSnapshot(`
    Array [
      Object {
        "bundle": <Bundle>,
        "type": "bundle cached",
      },
    ]
  `);
});

it('emits "bundle not cached" event when cacheKey is up to date but caching is disabled in config', async () => {
  const config = OptimizerConfig.create({
    repoRoot: MOCK_REPO_DIR,
    pluginScanDirs: [],
    pluginPaths: [Path.resolve(MOCK_REPO_DIR, 'plugins/foo')],
    maxWorkerCount: 1,
    cache: false,
  });
  const [bundle] = config.bundles;

  const optimizerCacheKey = 'optimizerCacheKey';
  const files = [
    Path.resolve(MOCK_REPO_DIR, 'plugins/foo/public/ext.ts'),
    Path.resolve(MOCK_REPO_DIR, 'plugins/foo/public/index.ts'),
    Path.resolve(MOCK_REPO_DIR, 'plugins/foo/public/lib.ts'),
  ];
  const hashes = await getHashes(files);
  const cacheKey = bundle.createCacheKey(files, hashes);

  bundle.cache.set({
    cacheKey,
    optimizerCacheKey,
    files,
    moduleCount: files.length,
    bundleRefExportIds: [],
  });

  const cacheEvents = await allValuesFrom(getBundleCacheEvent$(config, optimizerCacheKey));

  expect(cacheEvents).toMatchInlineSnapshot(`
    Array [
      Object {
        "bundle": <Bundle>,
        "reason": "cache disabled",
        "type": "bundle not cached",
      },
    ]
  `);
});

it('emits "bundle not cached" event when optimizerCacheKey is missing', async () => {
  const config = OptimizerConfig.create({
    repoRoot: MOCK_REPO_DIR,
    pluginScanDirs: [],
    pluginPaths: [Path.resolve(MOCK_REPO_DIR, 'plugins/foo')],
    maxWorkerCount: 1,
  });
  const [bundle] = config.bundles;

  const optimizerCacheKey = 'optimizerCacheKey';
  const files = [
    Path.resolve(MOCK_REPO_DIR, 'plugins/foo/public/ext.ts'),
    Path.resolve(MOCK_REPO_DIR, 'plugins/foo/public/index.ts'),
    Path.resolve(MOCK_REPO_DIR, 'plugins/foo/public/lib.ts'),
  ];
  const hashes = await getHashes(files);
  const cacheKey = bundle.createCacheKey(files, hashes);

  bundle.cache.set({
    cacheKey,
    optimizerCacheKey: undefined,
    files,
    moduleCount: files.length,
    bundleRefExportIds: [],
  });

  const cacheEvents = await allValuesFrom(getBundleCacheEvent$(config, optimizerCacheKey));

  expect(cacheEvents).toMatchInlineSnapshot(`
    Array [
      Object {
        "bundle": <Bundle>,
        "reason": "missing optimizer cache key",
        "type": "bundle not cached",
      },
    ]
  `);
});

it('emits "bundle not cached" event when optimizerCacheKey is outdated, includes diff', async () => {
  const config = OptimizerConfig.create({
    repoRoot: MOCK_REPO_DIR,
    pluginScanDirs: [],
    pluginPaths: [Path.resolve(MOCK_REPO_DIR, 'plugins/foo')],
    maxWorkerCount: 1,
  });
  const [bundle] = config.bundles;

  const optimizerCacheKey = 'optimizerCacheKey';
  const files = [
    Path.resolve(MOCK_REPO_DIR, 'plugins/foo/public/ext.ts'),
    Path.resolve(MOCK_REPO_DIR, 'plugins/foo/public/index.ts'),
    Path.resolve(MOCK_REPO_DIR, 'plugins/foo/public/lib.ts'),
  ];
  const hashes = await getHashes(files);
  const cacheKey = bundle.createCacheKey(files, hashes);

  bundle.cache.set({
    cacheKey,
    optimizerCacheKey: 'old',
    files,
    moduleCount: files.length,
    bundleRefExportIds: [],
  });

  const cacheEvents = await allValuesFrom(getBundleCacheEvent$(config, optimizerCacheKey));

  expect(cacheEvents).toMatchInlineSnapshot(`
    Array [
      Object {
        "bundle": <Bundle>,
        "diff": "[32m- Expected[39m
    [31m+ Received[39m

    [32m- \\"old\\"[39m
    [31m+ \\"optimizerCacheKey\\"[39m",
        "reason": "optimizer cache key mismatch",
        "type": "bundle not cached",
      },
    ]
  `);
});

it('emits "bundle not cached" event when bundleRefExportIds is outdated, includes diff', async () => {
  const config = OptimizerConfig.create({
    repoRoot: MOCK_REPO_DIR,
    pluginScanDirs: [],
    pluginPaths: [Path.resolve(MOCK_REPO_DIR, 'plugins/foo')],
    maxWorkerCount: 1,
  });
  const [bundle] = config.bundles;

  const optimizerCacheKey = 'optimizerCacheKey';
  const files = [
    Path.resolve(MOCK_REPO_DIR, 'plugins/foo/public/ext.ts'),
    Path.resolve(MOCK_REPO_DIR, 'plugins/foo/public/index.ts'),
    Path.resolve(MOCK_REPO_DIR, 'plugins/foo/public/lib.ts'),
  ];
  const hashes = await getHashes(files);
  const cacheKey = bundle.createCacheKey(files, hashes);

  bundle.cache.set({
    cacheKey,
    optimizerCacheKey,
    files,
    moduleCount: files.length,
    bundleRefExportIds: ['plugin/bar/public'],
  });

  const cacheEvents = await allValuesFrom(getBundleCacheEvent$(config, optimizerCacheKey));

  expect(cacheEvents).toMatchInlineSnapshot(`
    Array [
      Object {
        "bundle": <Bundle>,
        "diff": "[32m- Expected[39m
    [31m+ Received[39m

    [2m  [[22m
    [31m+   \\"plugin/bar/public\\"[39m
    [2m  ][22m",
        "reason": "bundle references outdated",
        "type": "bundle not cached",
      },
    ]
  `);
});

it('emits "bundle not cached" event when cacheKey is missing', async () => {
  const config = OptimizerConfig.create({
    repoRoot: MOCK_REPO_DIR,
    pluginScanDirs: [],
    pluginPaths: [Path.resolve(MOCK_REPO_DIR, 'plugins/foo')],
    maxWorkerCount: 1,
  });
  const [bundle] = config.bundles;

  const optimizerCacheKey = 'optimizerCacheKey';
  const files = [
    Path.resolve(MOCK_REPO_DIR, 'plugins/foo/public/ext.ts'),
    Path.resolve(MOCK_REPO_DIR, 'plugins/foo/public/index.ts'),
    Path.resolve(MOCK_REPO_DIR, 'plugins/foo/public/lib.ts'),
  ];

  bundle.cache.set({
    cacheKey: undefined,
    optimizerCacheKey,
    files,
    moduleCount: files.length,
    bundleRefExportIds: [],
  });

  const cacheEvents = await allValuesFrom(getBundleCacheEvent$(config, optimizerCacheKey));

  expect(cacheEvents).toMatchInlineSnapshot(`
    Array [
      Object {
        "bundle": <Bundle>,
        "reason": "missing cache key",
        "type": "bundle not cached",
      },
    ]
  `);
});

it('emits "bundle not cached" event when cacheKey is outdated', async () => {
  const config = OptimizerConfig.create({
    repoRoot: MOCK_REPO_DIR,
    pluginScanDirs: [],
    pluginPaths: [Path.resolve(MOCK_REPO_DIR, 'plugins/foo')],
    maxWorkerCount: 1,
  });
  const [bundle] = config.bundles;

  const optimizerCacheKey = 'optimizerCacheKey';
  const files = [
    Path.resolve(MOCK_REPO_DIR, 'plugins/foo/public/ext.ts'),
    Path.resolve(MOCK_REPO_DIR, 'plugins/foo/public/index.ts'),
    Path.resolve(MOCK_REPO_DIR, 'plugins/foo/public/lib.ts'),
  ];

  bundle.cache.set({
    cacheKey: 'old',
    optimizerCacheKey,
    files,
    moduleCount: files.length,
    bundleRefExportIds: [],
  });

  jest.spyOn(bundle, 'createCacheKey').mockImplementation(() => 'new');

  const cacheEvents = await allValuesFrom(getBundleCacheEvent$(config, optimizerCacheKey));

  expect(cacheEvents).toMatchInlineSnapshot(`
    Array [
      Object {
        "bundle": <Bundle>,
        "diff": "[32m- Expected[39m
    [31m+ Received[39m

    [32m- \\"old\\"[39m
    [31m+ \\"new\\"[39m",
        "reason": "cache key mismatch",
        "type": "bundle not cached",
      },
    ]
  `);
});
