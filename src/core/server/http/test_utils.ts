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

import { BehaviorSubject } from 'rxjs';
import { REPO_ROOT } from '@osd/dev-utils';
import { ByteSizeValue } from '@osd/config-schema';
import { Env } from '../config';
import { HttpService } from './http_service';
import { CoreContext } from '../core_context';
import { getEnvOptions, configServiceMock } from '../config/mocks';
import { loggingSystemMock } from '../logging/logging_system.mock';
import { dynamicConfigServiceMock } from '../config/dynamic_config_service.mock';

const coreId = Symbol('core');
const env = Env.createDefault(REPO_ROOT, getEnvOptions());

const logger = loggingSystemMock.create();

const configService = configServiceMock.create();
configService.atPath.mockReturnValue(
  new BehaviorSubject({
    hosts: ['localhost'],
    maxPayload: new ByteSizeValue(1024),
    autoListen: true,
    ssl: {
      enabled: false,
    },
    compression: { enabled: true },
    xsrf: {
      disableProtection: true,
      whitelist: [],
    },
    customResponseHeaders: {},
    requestId: {
      allowFromAnyIp: true,
      ipAllowlist: [],
    },
    keepaliveTimeout: 120_000,
    socketTimeout: 120_000,
  } as any)
);

const dynamicConfigService = dynamicConfigServiceMock.create();

const defaultContext: CoreContext = {
  coreId,
  env,
  logger,
  configService,
  dynamicConfigService,
};

export const createCoreContext = (overrides: Partial<CoreContext> = {}): CoreContext => ({
  ...defaultContext,
  ...overrides,
});

/**
 * Creates a concrete HttpServer with a mocked context.
 */
export const createHttpServer = (overrides: Partial<CoreContext> = {}): HttpService => {
  return new HttpService(createCoreContext(overrides));
};
