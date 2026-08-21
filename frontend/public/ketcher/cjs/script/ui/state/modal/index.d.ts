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
import { type Dispatch, type AnyAction } from 'redux';
import { type ModalFormState } from './form';
interface ModalDialogProps {
    onResult: (value: unknown) => void;
    onCancel: (reason?: unknown) => void;
    isNestedModal?: boolean;
    isRestoredModal?: boolean;
    [key: string]: unknown;
}
interface ModalState {
    name: string;
    form: ModalFormState | null;
    prop: ModalDialogProps | null;
    parentModal: ModalState | null;
}
interface ModalOpenAction {
    type: 'MODAL_OPEN';
    data: {
        name: string;
        prop?: Partial<ModalDialogProps>;
    };
}
interface ModalCloseAction {
    type: 'MODAL_CLOSE';
}
declare type ModalAction = ModalOpenAction | ModalCloseAction | AnyAction;
export type { ModalState, ModalDialogProps };
export declare function openDialog(dispatch: Dispatch, dialogName: string, props?: Record<string, unknown>): Promise<unknown>;
declare function modalReducer(state: ModalState | null | undefined, action: ModalAction): ModalState | null;
export default modalReducer;
