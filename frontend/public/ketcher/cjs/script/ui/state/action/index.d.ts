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
import { type Struct } from 'ketcher-core';
import { type UiActionAction } from '../../action';
import type Editor from '../../../editor/Editor';
declare type ActionParams = {
    editor: Editor & {
        struct(): Struct;
        struct(value: Struct | null): Struct;
    };
    server: unknown;
    options: {
        app: {
            server?: unknown;
            templates?: unknown;
            functionalGroups?: unknown;
        };
        buttons?: Record<string, {
            hidden?: boolean;
        }>;
    };
};
declare type ActionStatus = {
    selected?: boolean;
    disabled?: boolean;
    hidden?: boolean;
};
declare type ActionState = {
    activeTool: UiActionAction | null | undefined;
    [actionName: string]: ActionStatus | UiActionAction | null | undefined;
};
declare type ReducerAction = {
    type: string;
    action?: UiActionAction;
} & Partial<ActionParams>;
export default function (state: ActionState | null | undefined, { type, action, ...params }: ReducerAction): ActionState | null;
export {};
