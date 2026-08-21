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
import type { Dispatch } from 'redux';
import type { Struct } from 'ketcher-core';
import type Editor from '../../editor/Editor';
declare type ToolVariant = 'any-atom' | 'about' | 'analyse' | 'arom' | 'atom-props' | 'bond-any' | 'bond-hydrogen' | 'bond-aromatic' | 'bond-crossed' | 'bond-dative' | 'bond-double' | 'bond-doublearomatic' | 'bond-down' | 'bond-props' | 'bond-single' | 'bond-singlearomatic' | 'bond-singledouble' | 'bond-triple' | 'bond-up' | 'bond-updown' | 'copies' | 'copy-mol' | 'copy-ket' | 'chain' | 'charge-minus' | 'charge-plus' | 'check' | 'chiral-flag' | 'cip' | 'clean' | 'copy' | 'copy-image' | 'cut' | 'dearom' | 'dropdown' | 'deselect-all' | 'enhanced-stereo' | 'erase' | 'extended-table' | 'fullscreen' | 'functional-groups' | 'generic-groups' | 'help' | 'info-modal' | 'layout' | 'logo' | 'miew' | 'clear' | 'open' | 'paste' | 'period-table' | 'reaction-arrow' | 'reaction-automap' | 'reaction-map' | 'reaction-plus' | 'reaction-unmap' | 'recognize' | 'redo' | 'rgroup-attpoints' | 'rgroup-fragment' | 'rgroup-label' | 'save' | 'select-structure' | 'select-fragment' | 'select-lasso' | 'select-rectangle' | 'select-all' | 'select-descriptors' | 'settings' | 'sgroup' | 'template-0' | 'template-1' | 'template-2' | 'template-3' | 'template-4' | 'template-5' | 'template-6' | 'template-7' | 'template-lib' | 'text' | 'transform-flip-h' | 'transform-flip-v' | 'transform-rotate' | 'zoom-in' | 'zoom-out' | 'shape-circle' | 'shape-rectangle' | 'shape-polyline' | 'shape-line' | 'undo';
declare type ActionStateEditor = Editor & {
    actions?: {
        active?: {
            tool?: string;
        };
    };
    struct(): Struct;
    struct(value: Struct | null): Struct;
};
declare type ActionStateOptions = {
    app: {
        server?: unknown;
        templates?: unknown;
        functionalGroups?: unknown;
    };
    buttons?: Record<string, {
        hidden?: boolean;
    }>;
};
declare type ActionThunkState = {
    editor: ActionStateEditor;
    toolbar: {
        visibleTools: {
            select: ToolVariant;
        };
    };
};
declare type ActionObj = {
    tool?: string;
    opts?: unknown;
    dialog?: string;
    thunk?: (dispatch: Dispatch, getState: () => ActionThunkState) => void;
};
declare type ActionFn = (editor: ActionStateEditor) => void;
declare type UiActionAction = ActionObj | ActionFn;
declare type GetSelectedState = (editor: ActionStateEditor, server?: unknown) => boolean;
declare type GetDisabledState = (editor: ActionStateEditor, server: unknown, options: ActionStateOptions) => boolean;
declare type GetHiddenState = (options: ActionStateOptions) => boolean;
export declare type GetActionState = GetSelectedState | GetDisabledState | GetHiddenState;
declare type IsSelectedState = boolean | GetSelectedState;
declare type IsDisabledState = boolean | GetDisabledState;
declare type IsHiddenState = boolean | GetHiddenState;
interface UiAction {
    title?: string;
    shortcut?: string | Array<string>;
    enabledInViewOnly?: true;
    action: UiActionAction;
    selected?: IsSelectedState;
    disabled?: IsDisabledState;
    hidden?: IsHiddenState;
    onAction?: (action: UiActionAction) => void;
}
declare type Tools = {
    [key in ToolVariant]: UiAction;
};
export type { Tools, UiAction, UiActionAction };
