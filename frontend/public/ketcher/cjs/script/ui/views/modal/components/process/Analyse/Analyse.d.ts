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
import type { DialogParams } from '../../../../../../../components/Dialog/Dialog';
import type { AnalyseValues } from '../../../../../state/store.types';
interface RoundSettings {
    roundWeight: number;
    roundMass: number;
    roundElAnalysis: number;
    [key: string]: number;
}
interface AnalyseDialogProps extends DialogParams {
    values: AnalyseValues | null;
    round: RoundSettings;
    loading: boolean;
}
interface AnalyseDialogCallProps {
    onAnalyse: () => void;
    onChangeRound: (roundName: string, value: string) => void;
}
declare type Props = AnalyseDialogProps & AnalyseDialogCallProps;
declare function AnalyseDialog({ values, round, loading, onAnalyse, onChangeRound, ...props }: Props): import("react/jsx-runtime").JSX.Element;
declare const Analyse: import("react-redux").ConnectedComponent<typeof AnalyseDialog, {
    className?: string | undefined;
    isNestedModal?: boolean | undefined;
    onCancel: () => void;
    onOk: (result: unknown) => void;
    context?: import("react").Context<import("react-redux").ReactReduxContextValue<any, import("redux").UnknownAction> | null> | undefined;
    store?: import("redux").Store<any, import("redux").UnknownAction, unknown> | undefined;
}>;
export default Analyse;
