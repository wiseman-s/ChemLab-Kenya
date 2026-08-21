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
declare type ModalErrors = Record<string, unknown>;
interface ModalValidationState<TResult extends Record<string, unknown>> {
    errors: ModalErrors;
    valid: boolean;
    result: TResult;
}
interface ModalReducerActionData<TResult extends Record<string, unknown>> {
    valid: boolean;
    errors: ModalErrors;
    result: Partial<TResult> & Record<string, unknown>;
}
interface ModalReducerAction<TResult extends Record<string, unknown>> {
    data: ModalReducerActionData<TResult>;
}
interface SdataInitializerSchema {
    key?: string;
}
interface SdataResult extends Record<string, unknown> {
    context: string;
    fieldName: string;
    fieldValue: string;
    radiobuttons: string;
    type: 'DAT' | 'nucleotideComponent';
    init?: boolean;
}
declare type SdataState = ModalValidationState<SdataResult>;
declare type SdataActionData = Omit<ModalReducerActionData<SdataResult>, 'result'> & {
    result: Partial<SdataResult> & Record<string, unknown>;
};
declare type SdataAction = Omit<ModalReducerAction<SdataResult>, 'data'> & {
    data: SdataActionData;
};
export declare const initSdata: (schema: SdataInitializerSchema) => SdataState;
export declare function sdataReducer(state: SdataState, action: SdataAction): SdataState;
export declare function nucleotideComponentReducer(state: SdataState, action: SdataAction): SdataState;
export {};
