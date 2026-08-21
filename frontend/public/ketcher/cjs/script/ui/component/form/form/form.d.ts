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
/// <reference types="react" />
import { type FormSchema, type SchemaProperty } from '../../../../../contexts';
export interface FormOwnProps {
    children: React.ReactNode;
    schema: FormSchema;
    init?: Record<string, any> | null;
    customValid?: Record<string, (value: any) => boolean | string>;
    serialize?: Record<string, string>;
    deserialize?: Record<string, string>;
}
interface FormDispatchProps {
    onUpdate: (result: Record<string, unknown>, valid: boolean, errors: Record<string, string>) => void;
}
interface FormStateProps {
    result: Record<string, any>;
    errors?: Record<string, string>;
}
export interface FormState<TResult = Record<string, any>> {
    result: TResult;
    valid: boolean;
    errors?: Record<string, string>;
}
declare type FormProps = FormOwnProps & FormDispatchProps & FormStateProps;
export type { FormProps };
export interface FieldProps {
    title?: string;
    name?: string;
    component?: React.ComponentType<any> | string;
    options?: Array<{
        value: string;
        label: string;
    }>;
    disabled?: boolean;
    formName?: string;
    'data-testid'?: string;
    maxLength?: number;
    labelPos?: string | boolean;
    className?: string;
    extraName?: string;
    tooltip?: string;
    extraLabel?: string;
    schema?: SchemaProperty | any[];
    extraSchema?: SchemaProperty;
    type?: string;
    value?: string | number | boolean;
    onChange?: (value: any) => void;
    placeholder?: string;
    checked?: boolean;
    multiple?: boolean;
    testId?: string;
    disabledIds?: unknown[];
    classes?: Record<string, string | undefined>;
}
export interface FieldWithModalProps extends FieldProps {
    onEdit?: (onChange: (value: any) => void) => void;
    autoFocus?: boolean;
}
export declare type SelectOneOfProps = FieldProps;
export interface CustomQueryFieldProps extends FieldProps {
    name: string;
    labelPos: string;
    checkboxValue?: boolean;
    onCheckboxChange?: (value: boolean, formState: any, onChange: (value: any) => void, updateFormState: (settings: any) => void) => void;
}
declare const _default: import("react").ComponentType<FormOwnProps & FormStateProps>;
export default _default;
declare function Field(props: Readonly<FieldProps>): import("react/jsx-runtime").JSX.Element;
declare function FieldWithModal(props: Readonly<FieldWithModalProps>): import("react/jsx-runtime").JSX.Element;
declare function CustomQueryField(props: Readonly<CustomQueryFieldProps>): import("react/jsx-runtime").JSX.Element;
declare const SelectOneOf: (props: SelectOneOfProps) => import("react/jsx-runtime").JSX.Element;
export { Field, CustomQueryField, FieldWithModal, SelectOneOf };
