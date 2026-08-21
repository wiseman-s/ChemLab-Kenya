import type { Tool } from './Tool';
import type Editor from '../Editor';
declare class CreateMonomerTool implements Tool {
    private readonly editor;
    constructor(editor: Editor);
    mousemove(): void;
}
export default CreateMonomerTool;
