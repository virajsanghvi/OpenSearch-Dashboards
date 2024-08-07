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

import React, { useState } from 'react';
import {
  EuiForm,
  EuiSmallButtonIcon,
  EuiFieldText,
  EuiCompressedFormRow,
  EuiFormRow,
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@osd/i18n';

import {
  IAggConfig,
  Query,
  QueryStringInput,
  DataPublicPluginStart,
} from '../../../../data/public';
import { useOpenSearchDashboards } from '../../../../opensearch_dashboards_react/public';

interface FilterRowProps {
  id: string;
  arrayIndex: number;
  customLabel: string;
  value: Query;
  autoFocus: boolean;
  disableRemove: boolean;
  dataTestSubj: string;
  onChangeValue(id: string, query: Query, label: string): void;
  onRemoveFilter(id: string): void;
  agg: IAggConfig;
}

function FilterRow({
  id,
  arrayIndex,
  customLabel,
  value,
  autoFocus,
  disableRemove,
  dataTestSubj,
  agg,
  onChangeValue,
  onRemoveFilter,
}: FilterRowProps) {
  const { services } = useOpenSearchDashboards<{ data: DataPublicPluginStart; appName: string }>();
  const [showCustomLabel, setShowCustomLabel] = useState(false);
  const filterLabel = i18n.translate('visDefaultEditor.controls.filters.filterLabel', {
    defaultMessage: 'Filter {index}',
    values: {
      index: arrayIndex + 1,
    },
  });

  const onBlur = () => {
    if (value.query.length > 0) {
      // Store filter to the query log so that it is available in autocomplete.
      services.data.query.addToQueryLog(services.appName, value);
    }
  };

  const FilterControl = (
    <div>
      <EuiSmallButtonIcon
        iconType="tag"
        aria-label={i18n.translate(
          'visDefaultEditor.controls.filters.toggleFilterButtonAriaLabel',
          {
            defaultMessage: 'Toggle filter label',
          }
        )}
        aria-expanded={showCustomLabel}
        aria-controls={`visEditorFilterLabel${arrayIndex}`}
        onClick={() => setShowCustomLabel(!showCustomLabel)}
      />
      <EuiSmallButtonIcon
        iconType="trash"
        color="danger"
        disabled={disableRemove}
        aria-label={i18n.translate(
          'visDefaultEditor.controls.filters.removeFilterButtonAriaLabel',
          {
            defaultMessage: 'Remove this filter',
          }
        )}
        onClick={() => onRemoveFilter(id)}
      />
    </div>
  );

  return (
    <EuiForm>
      <EuiCompressedFormRow
        label={`${filterLabel}${customLabel ? ` - ${customLabel}` : ''}`}
        labelAppend={FilterControl}
        fullWidth={true}
      >
        <QueryStringInput
          query={value}
          indexPatterns={[agg.getIndexPattern()]}
          onChange={(query: Query) => onChangeValue(id, query, customLabel)}
          onBlur={onBlur}
          disableAutoFocus={!autoFocus}
          dataTestSubj={dataTestSubj}
          bubbleSubmitEvent={true}
          languageSwitcherPopoverAnchorPosition="leftDown"
          size="s"
        />
      </EuiCompressedFormRow>
      {showCustomLabel ? (
        <EuiFormRow
          id={`visEditorFilterLabel${arrayIndex}`}
          label={i18n.translate('visDefaultEditor.controls.filters.definiteFilterLabel', {
            defaultMessage: 'Filter {index} label',
            description:
              "'Filter {index}' represents the name of the filter as a noun, similar to 'label for filter 1'.",
            values: {
              index: arrayIndex + 1,
            },
          })}
          fullWidth={true}
          display={'rowCompressed'}
        >
          <EuiFieldText
            value={customLabel}
            placeholder={i18n.translate('visDefaultEditor.controls.filters.labelPlaceholder', {
              defaultMessage: 'Label',
            })}
            onChange={(ev) => onChangeValue(id, value, ev.target.value)}
            fullWidth={true}
            compressed
          />
        </EuiFormRow>
      ) : null}
      <EuiSpacer size="m" />
    </EuiForm>
  );
}

export { FilterRow };
