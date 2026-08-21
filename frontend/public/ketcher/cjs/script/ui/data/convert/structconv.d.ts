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
import { type Atom, type AttachmentPoints, AtomList, Bond } from 'ketcher-core';
/** UI/form representation of an element, atom, or attachment point used in dialogs and tools. */
export interface ElementFormData {
    type?: string;
    values?: (string | number)[];
    label?: string;
    ap?: {
        primary: boolean;
        secondary: boolean;
    };
    atomType?: string;
    atomList?: string | AtomList | null;
    notList?: boolean;
    pseudo?: string | null;
    customQuery?: string | null;
    rglabel?: number | null;
    alias?: string | null;
    charge?: string;
    isotope?: string;
    explicitValence?: number;
    radical?: number;
    invRet?: number;
    exactChangeFlag?: boolean | number;
    ringBondCount?: number;
    substitutionCount?: number;
    unsaturatedAtom?: boolean | number;
    hCount?: number;
    stereoParity?: number;
    implicitHCount?: number | null;
    aromaticity?: string | null;
    ringMembership?: number | null;
    ringSize?: number | null;
    connectivity?: number | null;
    chirality?: string | null;
}
/** S-group data as it comes from the editor (pre-dialog). */
interface SGroupInput {
    type?: string;
    attrs: {
        context: string;
        fieldName: string;
        fieldValue: string | string[];
        absolute?: boolean;
        attached?: boolean;
        radiobuttons?: string;
        mul?: number;
        connectivity?: string;
        name?: string;
        nucleotideComponent?: string;
        subscript?: string;
        expanded?: boolean;
        showUnits?: boolean;
        nCharsToDisplay?: number;
        tagChar?: string;
        daspPos?: number;
        fieldType?: string;
        units?: string;
        query?: string;
        queryOp?: string;
    };
}
/** S-group form data returned by the S-group dialog. */
interface SGroupFormData {
    type?: string;
    context?: string;
    fieldName?: string;
    fieldValue?: string | string[];
    absolute?: boolean;
    attached?: boolean;
    radiobuttons?: string;
    mul?: number;
    connectivity?: string;
    name?: string;
    nucleotideComponent?: string;
    subscript?: string;
    expanded?: boolean;
    showUnits?: boolean;
    nCharsToDisplay?: number;
    tagChar?: string;
    daspPos?: number;
    fieldType?: string;
    units?: string;
    query?: string;
    queryOp?: string;
    selectedSruCount?: number;
}
export declare function fromElement(selem: Atom): Atom | {
    type: string;
    values: import("ketcher-core").ElementLabel[];
} | {
    alias: string;
    atomType: "list" | "pseudo" | "single";
    atomList: string;
    notList: boolean;
    pseudo: string;
    label: string;
    charge: string;
    isotope: string;
    explicitValence: number;
    radical: number;
    invRet: number;
    exactChangeFlag: boolean;
    ringBondCount: number;
    substitutionCount: number;
    unsaturatedAtom: boolean;
    hCount: number;
    stereoParity: number;
    implicitHCount: number | null;
    aromaticity: import("ketcher-core").Aromaticity | null | undefined;
    ringMembership: number | null | undefined;
    ringSize: number | null | undefined;
    connectivity: number | null | undefined;
    chirality: import("ketcher-core").Chirality | null | undefined;
    customQuery: string;
} | {
    label: string;
    fragment: number;
    atomList: AtomList | null;
    attachmentPoints: AttachmentPoints | null;
    isotope: number | null;
    isPreview: boolean;
    hCount: number;
    radical: number;
    cip: import("ketcher-core/dist/domain/entities/types").AtomCIP | null;
    charge: number | null;
    explicitValence: number;
    ringBondCount: number;
    queryProperties: import("ketcher-core").AtomQueryProperties;
    unsaturatedAtom: number;
    substitutionCount: number;
    valence: number;
    implicitH: number;
    implicitHCount: number | null;
    pp: import("ketcher-core").Vec2;
    neighbors: number[];
    sgs: import("ketcher-core").Pile<number>;
    badConn: boolean;
    alias: string | null;
    rglabel: string | null;
    aam: number;
    invRet: number;
    exactChangeFlag: number;
    rxnFragmentType: number;
    stereoLabel?: string | null | undefined;
    stereoParity: number;
    hasImplicitH?: boolean | undefined;
    pseudo: string;
    initiallySelected?: import("ketcher-core/dist/domain/entities/BaseMicromoleculeEntity").initiallySelectedType | undefined;
    type: string;
    values: number[];
    ap?: undefined;
} | {
    ap: {
        primary: boolean;
        secondary: boolean;
    };
} | null;
export declare function toElement(elem: ElementFormData): ElementFormData | {
    pseudo: null;
    label: string;
    atomList: AtomList;
} | Partial<Atom> | {
    attachmentPoints: number;
};
export declare function fromAtom(satom?: Atom): {
    alias: string;
    atomType: "list" | "pseudo" | "single";
    atomList: string;
    notList: boolean;
    pseudo: string;
    label: string;
    charge: string;
    isotope: string;
    explicitValence: number;
    radical: number;
    invRet: number;
    exactChangeFlag: boolean;
    ringBondCount: number;
    substitutionCount: number;
    unsaturatedAtom: boolean;
    hCount: number;
    stereoParity: number;
    implicitHCount: number | null;
    aromaticity: import("ketcher-core").Aromaticity | null | undefined;
    ringMembership: number | null | undefined;
    ringSize: number | null | undefined;
    connectivity: number | null | undefined;
    chirality: import("ketcher-core").Chirality | null | undefined;
    customQuery: string;
} | null;
export declare function toAtom(atom: ElementFormData): Partial<Atom>;
export declare function fromStereoLabel(stereoLabel: string | null): {
    type: null;
    orNumber?: undefined;
    andNumber?: undefined;
} | {
    type: string;
    orNumber: number;
    andNumber: number;
};
export declare function toStereoLabel(stereoLabel: {
    type: string | null;
    andNumber?: number;
    orNumber?: number;
}): string | null;
export declare function fromBond(sbond?: Bond): {
    type: string;
    topology: number | null;
    center: number | null;
    customQuery: string;
} | null;
export declare function toBond(bond: ReturnType<typeof fromBond>): {
    type: number;
    stereo: number;
    topology: number | null;
    reactingCenterStatus: number | null;
    customQuery: string | null;
} | null;
export declare function toBondType(caption: string): {
    type: number;
    stereo: number;
};
export declare function fromSgroup(ssgroup: SGroupInput): {
    context: string | undefined;
    fieldName: string | undefined;
    fieldValue: string | string[] | undefined;
    absolute?: boolean | undefined;
    attached?: boolean | undefined;
    radiobuttons?: string | undefined;
    mul?: number | undefined;
    connectivity?: string | undefined;
    name?: string | undefined;
    nucleotideComponent?: string | undefined;
    subscript?: string | undefined;
    expanded?: boolean | undefined;
    showUnits?: boolean | undefined;
    nCharsToDisplay?: number | undefined;
    tagChar?: string | undefined;
    daspPos?: number | undefined;
    fieldType?: string | undefined;
    units?: string | undefined;
    query?: string | undefined;
    queryOp?: string | undefined;
    type: string;
} | {
    context: string;
    fieldName: string;
    fieldValue: string | string[];
    absolute?: boolean | undefined;
    attached?: boolean | undefined;
    radiobuttons?: string | undefined;
    mul?: number | undefined;
    connectivity?: string | undefined;
    name?: string | undefined;
    nucleotideComponent?: string | undefined;
    subscript?: string | undefined;
    expanded?: boolean | undefined;
    showUnits?: boolean | undefined;
    nCharsToDisplay?: number | undefined;
    tagChar?: string | undefined;
    daspPos?: number | undefined;
    fieldType?: string | undefined;
    units?: string | undefined;
    query?: string | undefined;
    queryOp?: string | undefined;
    type: string;
};
export declare function toSgroup(sgroup: SGroupFormData): {
    type: string | undefined;
    attrs: {
        context?: string | undefined;
        fieldName?: string | undefined;
        fieldValue?: string | string[] | undefined;
        absolute?: boolean | undefined;
        attached?: boolean | undefined;
        mul?: number | undefined;
        connectivity?: string | undefined;
        name?: string | undefined;
        nucleotideComponent?: string | undefined;
        subscript?: string | undefined;
        expanded?: boolean | undefined;
        showUnits?: boolean | undefined;
        nCharsToDisplay?: number | undefined;
        tagChar?: string | undefined;
        daspPos?: number | undefined;
        fieldType?: string | undefined;
        units?: string | undefined;
        query?: string | undefined;
        queryOp?: string | undefined;
        selectedSruCount?: number | undefined;
    };
};
export {};
