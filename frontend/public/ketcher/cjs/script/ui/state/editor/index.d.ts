export default function initEditor(dispatch: any, getState: any): {
    onInit: (editor: any) => void;
    onChange: (action: any) => void;
    onSelectionChange: () => void;
    onElementEdit: (selem: any) => Promise<unknown>;
    onEnhancedStereoEdit: ({ ...init }: {
        [x: string]: any;
    }) => Promise<string | null>;
    onQuickEdit: (atom: any) => Promise<unknown>;
    onBondEdit: (bonds: any) => Promise<{
        type: number;
        stereo: number;
        topology: number | null;
        reactingCenterStatus: number | null;
        customQuery: string | null;
    } | null>;
    onRgroupEdit: (rgroup: any) => Promise<unknown>;
    onSgroupEdit: (sgroup: any) => Promise<{
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
    }>;
    onRemoveFG: (result: any) => Promise<unknown>;
    onMessage: (msg: any) => void;
    onAromatizeStruct: (struct: any) => any;
    onDearomatizeStruct: (struct: any) => any;
    onMouseDown: () => void;
    onConfirm: () => Promise<unknown>;
    onShowInfo: (payload: any) => void;
    onApiSettings: (payload: any) => any;
    onUpdateFloatingTools: (...args: any[]) => void;
    onZoomIn: import("lodash").DebouncedFunc<() => any>;
    onZoomOut: import("lodash").DebouncedFunc<() => any>;
    onZoomChanged: import("lodash").DebouncedFunc<() => any>;
    onShowMacromoleculesErrorMessage: (payload: any) => any;
};
