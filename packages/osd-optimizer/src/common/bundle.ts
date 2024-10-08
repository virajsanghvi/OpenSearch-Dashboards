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
import Fs from 'fs';

import { BundleCache } from './bundle_cache';
import { UnknownVals } from './ts_helpers';
import { includes, ascending, entriesToObject } from './array_helpers';

const VALID_BUNDLE_TYPES = ['plugin' as const, 'entry' as const];

const DEFAULT_IMPLICIT_BUNDLE_DEPS = ['core'];

const isStringArray = (input: any): input is string[] =>
  Array.isArray(input) && input.every((x) => typeof x === 'string');

export interface BundleSpec {
  readonly type: typeof VALID_BUNDLE_TYPES[0];
  /** Unique id for this bundle */
  readonly id: string;
  /** directory names relative to the contextDir that can be imported from */
  readonly publicDirNames: string[];
  /** Absolute path to the plugin source directory */
  readonly contextDir: string;
  /** Absolute path to the root of the repository */
  readonly sourceRoot: string;
  /** Absolute path to the directory where output should be written */
  readonly outputDir: string;
  /** Banner that should be written to all bundle JS files */
  readonly banner?: string;
  /** Absolute path to a opensearch_dashboards.json manifest file, if omitted we assume there are not dependenices */
  readonly manifestPath?: string;
}

export class Bundle {
  /** Bundle type, only "plugin" is supported for now */
  public readonly type: BundleSpec['type'];
  /** Unique identifier for this bundle */
  public readonly id: BundleSpec['id'];
  /** directory names relative to the contextDir that can be imported from */
  public readonly publicDirNames: BundleSpec['publicDirNames'];
  /**
   * Absolute path to the root of the bundle context (plugin directory)
   * where the entry is resolved relative to and the default output paths
   * are relative to
   */
  public readonly contextDir: BundleSpec['contextDir'];
  /** Absolute path to the root of the whole project source, repo root */
  public readonly sourceRoot: BundleSpec['sourceRoot'];
  /** Absolute path to the output directory for this bundle */
  public readonly outputDir: BundleSpec['outputDir'];
  /** Banner that should be written to all bundle JS files */
  public readonly banner: BundleSpec['banner'];
  /**
   * Absolute path to a manifest file with "requiredBundles" which will be
   * used to allow bundleRefs from this bundle to the exports of another bundle.
   * Every bundle mentioned in the `requiredBundles` must be built together.
   */
  public readonly manifestPath: BundleSpec['manifestPath'];

  public readonly cache: BundleCache;

  constructor(spec: BundleSpec) {
    this.type = spec.type;
    this.id = spec.id;
    this.publicDirNames = spec.publicDirNames;
    this.contextDir = spec.contextDir;
    this.sourceRoot = spec.sourceRoot;
    this.outputDir = spec.outputDir;
    this.manifestPath = spec.manifestPath;
    this.banner = spec.banner;

    this.cache = new BundleCache(Path.resolve(this.outputDir, '.osd-optimizer-cache'));
  }

  /**
   * Calculate the cache key for this bundle based from current
   * hash values.
   */
  createCacheKey(files: string[], hashes: Map<string, string | undefined>): unknown {
    return {
      spec: this.toSpec(),
      hashes: entriesToObject(
        files.map((p) => [p, hashes.get(p)] as const).sort(ascending((e) => e[0]))
      ),
    };
  }

  /**
   * Get the raw "specification" for the bundle, this object is JSON serialized
   * in the cache key, passed to worker processes so they know what bundles
   * to build, and passed to the Bundle constructor to rebuild the Bundle object.
   */
  toSpec(): BundleSpec {
    return {
      type: this.type,
      id: this.id,
      publicDirNames: this.publicDirNames,
      contextDir: this.contextDir,
      sourceRoot: this.sourceRoot,
      outputDir: this.outputDir,
      manifestPath: this.manifestPath,
      banner: this.banner,
    };
  }

  readBundleDeps(): { implicit: string[]; explicit: string[] } {
    if (!this.manifestPath) {
      return {
        implicit: [...DEFAULT_IMPLICIT_BUNDLE_DEPS],
        explicit: [],
      };
    }

    let json: string;
    try {
      json = Fs.readFileSync(this.manifestPath, 'utf8');
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }

      json = '{}';
    }

    let parsedManifest: { requiredPlugins?: string[]; requiredBundles?: string[] };
    try {
      parsedManifest = JSON.parse(json);
    } catch (error) {
      throw new Error(
        `unable to parse manifest at [${this.manifestPath}], error: [${error.message}]`
      );
    }

    if (typeof parsedManifest === 'object' && parsedManifest) {
      const explicit = parsedManifest.requiredBundles || [];
      const implicit = [...DEFAULT_IMPLICIT_BUNDLE_DEPS, ...(parsedManifest.requiredPlugins || [])];

      if (isStringArray(explicit) && isStringArray(implicit)) {
        return {
          explicit,
          implicit,
        };
      }
    }

    throw new Error(
      `Expected "requiredBundles" and "requiredPlugins" in manifest file [${this.manifestPath}] to be arrays of strings`
    );
  }
}

/**
 * Parse a JSON string containing an array of BundleSpec objects into an array
 * of Bundle objects, validating everything.
 */
export function parseBundles(json: string) {
  try {
    if (typeof json !== 'string') {
      throw new Error('must be a JSON string');
    }

    const specs: Array<UnknownVals<BundleSpec>> = JSON.parse(json);

    if (!Array.isArray(specs)) {
      throw new Error('must be an array');
    }

    return specs.map(
      (spec: UnknownVals<BundleSpec>): Bundle => {
        if (!(spec && typeof spec === 'object')) {
          throw new Error('`bundles[]` must be an object');
        }

        const { type } = spec;
        if (!includes(VALID_BUNDLE_TYPES, type)) {
          throw new Error('`bundles[]` must have a valid `type`');
        }

        const { id } = spec;
        if (!(typeof id === 'string')) {
          throw new Error('`bundles[]` must have a string `id` property');
        }

        const { publicDirNames } = spec;
        if (!Array.isArray(publicDirNames) || !publicDirNames.every((d) => typeof d === 'string')) {
          throw new Error('`bundles[]` must have an array of strings `publicDirNames` property');
        }

        const { contextDir } = spec;
        if (!(typeof contextDir === 'string' && Path.isAbsolute(contextDir))) {
          throw new Error('`bundles[]` must have an absolute path `contextDir` property');
        }

        const { sourceRoot } = spec;
        if (!(typeof sourceRoot === 'string' && Path.isAbsolute(sourceRoot))) {
          throw new Error('`bundles[]` must have an absolute path `sourceRoot` property');
        }

        const { outputDir } = spec;
        if (!(typeof outputDir === 'string' && Path.isAbsolute(outputDir))) {
          throw new Error('`bundles[]` must have an absolute path `outputDir` property');
        }

        const { manifestPath } = spec;
        if (manifestPath !== undefined) {
          if (!(typeof manifestPath === 'string' && Path.isAbsolute(manifestPath))) {
            throw new Error('`bundles[]` must have an absolute path `manifestPath` property');
          }
        }

        const { banner } = spec;
        if (banner !== undefined) {
          if (!(typeof banner === 'string')) {
            throw new Error('`bundles[]` must have a string `banner` property');
          }
        }

        return new Bundle({
          type,
          id,
          publicDirNames,
          contextDir,
          sourceRoot,
          outputDir,
          banner,
          manifestPath,
        });
      }
    );
  } catch (error) {
    throw new Error(`unable to parse bundles: ${error.message}`);
  }
}
