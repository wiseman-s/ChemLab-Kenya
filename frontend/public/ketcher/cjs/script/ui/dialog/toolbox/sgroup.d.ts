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
import { type DialogParams } from '../../views/components';
interface SgroupFormResult {
    type: string;
    context?: string;
    fieldName?: string;
    fieldValue?: string | string[];
    radiobuttons?: string;
    [key: string]: unknown;
}
interface SgroupFormState {
    errors: Record<string, unknown>;
    valid: boolean;
    result: SgroupFormResult;
}
interface SgroupOwnProps extends DialogParams {
    type?: string;
    selectedSruCount?: number;
    [key: string]: unknown;
}
interface SgroupProps extends SgroupOwnProps {
    formState: SgroupFormState;
}
declare function Sgroup({ formState, ...props }: Readonly<SgroupProps>): import("react/jsx-runtime").JSX.Element;
declare const _default: import("react-redux").ConnectedComponent<typeof Sgroup, {
    [x: string]: unknown;
    [x: number]: unknown;
    context?: import("react").Context<import("react-redux").ReactReduxContextValue<any, import("redux").UnknownAction> | null> | undefined;
    store?: import("redux").Store<any, import("redux").UnknownAction, unknown> | undefined;
}>;
export default _default;
