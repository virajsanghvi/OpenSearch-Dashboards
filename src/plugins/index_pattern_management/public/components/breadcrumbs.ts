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

import { i18n } from '@osd/i18n';
import { IndexPattern } from '../../../data/public';

export function getListBreadcrumbs(currentWorkspaceName?: string) {
  return [
    {
      text: currentWorkspaceName
        ? i18n.translate('indexPatternManagement.inWorkspace.indexPatterns.listBreadcrumb', {
            defaultMessage: 'Workspace index patterns',
          })
        : i18n.translate('indexPatternManagement.indexPatterns.listBreadcrumb', {
            defaultMessage: 'Index patterns',
          }),
      href: `/`,
    },
  ];
}

export function getCreateBreadcrumbs() {
  return [
    ...getListBreadcrumbs(),
    {
      text: i18n.translate('indexPatternManagement.indexPatterns.createBreadcrumb', {
        defaultMessage: 'Create index pattern',
      }),
      href: `/create`,
    },
  ];
}

export function getEditBreadcrumbs(indexPattern: IndexPattern) {
  return [
    ...getListBreadcrumbs(),
    {
      text: indexPattern.title,
      href: `/patterns/${indexPattern.id}`,
    },
  ];
}

export function getEditFieldBreadcrumbs(indexPattern: IndexPattern, fieldName: string) {
  return [
    ...getEditBreadcrumbs(indexPattern),
    {
      text: fieldName,
    },
  ];
}

export function getCreateFieldBreadcrumbs(indexPattern: IndexPattern) {
  return [
    ...getEditBreadcrumbs(indexPattern),
    {
      text: i18n.translate('indexPatternManagement.indexPatterns.createFieldBreadcrumb', {
        defaultMessage: 'Create field',
      }),
    },
  ];
}
