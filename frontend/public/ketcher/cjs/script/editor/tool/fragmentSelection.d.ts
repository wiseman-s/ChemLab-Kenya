import type Editor from '../Editor';
import type { Tool } from './Tool';
export default class FragmentSelectionTool implements Tool {
    private readonly editor;
    private preview;
    private tooltipTimeoutId?;
    private disabledMessage?;
    private bondPreview?;
    private dragCtx?;
    constructor(editor: Editor);
    mousedown(event: PointerEvent): void;
    mouseup(): boolean;
    private removeBondPreview;
    mousemove(event: PointerEvent): void;
    mouseleave(): void;
    mouseLeaveClientArea(): void;
    private resetPreview;
    private setDisabledState;
    private queueTooltip;
    private clearTooltip;
    private setCursor;
    private isBondInCycle;
    private collectFragment;
    private getComponentData;
    cancel(): void;
}
