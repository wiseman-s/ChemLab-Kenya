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
import { type Struct, type StructService, type OutputFormatType, type StructServiceOptions, type SupportedFormatProperties, SupportedFormat } from 'ketcher-core';
interface FormState {
    result: {
        filename: string;
        format: SupportedFormat | OutputFormatType | SupportedFormatProperties;
    };
    valid: boolean;
    errors: Record<string, string>;
    moleculeErrors?: Record<string, string>;
}
interface CheckState {
    checkOptions: unknown;
}
interface Editor {
    selection: () => {
        atoms?: number[];
    } | null;
    errorHandler: (message: string) => void;
    struct: () => Struct;
    render: {
        options: {
            ignoreChiralFlag: boolean;
        };
    };
}
interface SaveDialogProps {
    server: StructService | null;
    struct: Struct;
    options: StructServiceOptions;
    formState: FormState;
    moleculeErrors?: Record<string, string>;
    checkState: CheckState;
    bondThickness?: number;
    ignoreChiralFlag: boolean;
    editor: Editor;
    onCheck: (checkOptions: unknown) => void;
    onTmplSave: (struct: Struct) => void;
    onResetForm: (prevState: FormState) => void;
    onOk: (result?: unknown) => void;
    onCancel: () => void;
}
declare const _default: import("react-redux").ConnectedComponent<(props: SaveDialogProps) => import("react/jsx-runtime").JSX.Element, {
    onOk: (result?: unknown) => void;
    onCancel: () => void;
    context?: import("react").Context<import("react-redux").ReactReduxContextValue<any, import("redux").UnknownAction> | null> | undefined;
    store?: import("redux").Store<any, import("redux").UnknownAction, unknown> | undefined;
}>;
export default _default;
