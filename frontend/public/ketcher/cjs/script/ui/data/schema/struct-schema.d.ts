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
interface CommonStructSchema {
    key?: string;
    title: string;
    type?: string;
    required?: string[];
}
export interface SchemaProperty extends CommonStructSchema {
    enum?: unknown[];
    enumNames?: string[];
    default?: unknown;
    format?: string;
    pattern?: string;
    maxLength?: number;
    minLength?: number;
    invalidMessage?: string | ((data: unknown) => string);
}
export interface StructSchema<T = Record<string, SchemaProperty | Record<string, unknown>>> extends CommonStructSchema {
    properties: T;
}
interface AtomProperties extends Record<string, SchemaProperty> {
    alias: SchemaProperty;
    aromaticity: SchemaProperty;
    atomList: SchemaProperty;
    atomType: SchemaProperty;
    charge: SchemaProperty;
    chirality: SchemaProperty;
    cip: SchemaProperty;
    connectivity: SchemaProperty;
    customQuery: SchemaProperty;
    exactChangeFlag: SchemaProperty;
    explicitValence: SchemaProperty;
    hCount: SchemaProperty;
    implicitHCount: SchemaProperty;
    invRet: SchemaProperty;
    isotope: SchemaProperty;
    label: SchemaProperty;
    notList: SchemaProperty;
    pseudo: SchemaProperty;
    radical: SchemaProperty;
    ringBondCount: SchemaProperty;
    ringMembership: SchemaProperty;
    ringSize: SchemaProperty;
    substitutionCount: SchemaProperty;
    unsaturatedAtom: SchemaProperty;
}
export declare const atom: StructSchema<AtomProperties>;
export declare const rgroupSchema: StructSchema;
export declare const labelEdit: StructSchema;
export declare const attachmentPoints: StructSchema;
export declare const bond: StructSchema;
export declare const sgroupMap: Record<string, StructSchema>;
export declare const rgroupLogic: StructSchema;
export declare const textSchema: StructSchema;
export declare const attachSchema: StructSchema;
export {};
