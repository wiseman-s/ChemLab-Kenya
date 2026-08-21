/****************************************************************************
 * Copyright 2021 EPAM Systems
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 ***************************************************************************/
import type { PeriodTableResult, PeriodTableType } from './types';
import { type FC } from 'react';
interface TableOwnProps {
    type?: PeriodTableType;
    values?: string[];
    label?: string;
    pseudo?: string;
    isNestedModal?: boolean;
    onOk: (result: PeriodTableResult) => void;
}
interface TableStateProps {
    isMonomerCreationWizardActive: boolean;
    type?: PeriodTableType;
    values?: string[];
    label?: string;
    pseudo?: string;
}
interface TableDispatchProps {
    onOk: (result: PeriodTableResult) => void;
}
declare type TableProps = TableOwnProps & TableStateProps & TableDispatchProps;
declare const PeriodTable: import("react-redux").ConnectedComponent<FC<TableProps>, {
    isNestedModal?: boolean | undefined;
    type?: PeriodTableType | undefined;
    values?: string[] | undefined;
    label?: string | undefined;
    pseudo?: string | undefined;
    onOk: (result: PeriodTableResult) => void;
    context?: import("react").Context<import("react-redux").ReactReduxContextValue<any, import("redux").UnknownAction> | null> | undefined;
    store?: import("redux").Store<any, import("redux").UnknownAction, unknown> | undefined;
}>;
export default PeriodTable;
