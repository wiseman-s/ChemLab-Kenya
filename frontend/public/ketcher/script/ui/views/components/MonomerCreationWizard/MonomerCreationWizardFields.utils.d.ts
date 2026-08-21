import { KetMonomerClass } from 'ketcher-core';
export declare const getMonomerPropertyVisibility: (type: KetMonomerClass | 'rnaPreset' | undefined) => {
    displayNaturalAnalogue: boolean;
    displayModificationTypes: boolean;
    displayAliases: boolean;
    displayHelmAlias: boolean;
    displayBilnAlias: boolean;
};
