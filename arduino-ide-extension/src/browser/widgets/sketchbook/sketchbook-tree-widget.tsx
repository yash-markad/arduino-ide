import * as React from 'react';
import { inject, injectable, postConstruct } from 'inversify';
import URI from '@theia/core/lib/common/uri';
import { TreeNode } from '@theia/core/lib/browser/tree/tree';
import { NodeProps, TreeProps } from '@theia/core/lib/browser/tree/tree-widget';
import { EditorManager } from '@theia/editor/lib/browser/editor-manager';
import { FileTreeWidget } from '@theia/filesystem/lib/browser';
import { ContextMenuRenderer } from '@theia/core/lib/browser/context-menu-renderer';
import { SketchbookTreeModel } from './sketchbook-tree-model';
import { ConfigService } from '../../../common/protocol';
import { SketchbookTree } from './sketchbook-tree';
import { ArduinoPreferences } from '../../arduino-preferences';

@injectable()
export class SketchbookTreeWidget extends FileTreeWidget {

    @inject(ConfigService)
    protected readonly configService: ConfigService;

    @inject(ArduinoPreferences)
    protected readonly arduinoPreferences: ArduinoPreferences;

    constructor(
        @inject(TreeProps) readonly props: TreeProps,
        @inject(SketchbookTreeModel) readonly model: SketchbookTreeModel,
        @inject(ContextMenuRenderer) readonly contextMenuRenderer: ContextMenuRenderer,
        @inject(EditorManager) readonly editorManager: EditorManager
    ) {
        super(props, model, contextMenuRenderer);
        this.id = 'arduino-sketchbook-tree-widget';
    }

    @postConstruct()
    protected async init(): Promise<void> {
        super.init();
        const setInput = () => this.configService.getConfiguration().then(({ sketchDirUri }) => this.initialize({ sketchDirUri }));
        this.toDispose.push(this.arduinoPreferences.onPreferenceChanged(({ preferenceName }) => {
            if (preferenceName === 'arduino.sketchbook.showAllFiles') {
                this.init();
            }
        }));
        setInput();
    }

    async initialize(options: { sketchDirUri: URI | string }): Promise<void> {
        return this.model.initialize(options);
    }

    protected renderIcon(node: TreeNode, props: NodeProps): React.ReactNode {
        if (SketchbookTree.SketchDirNode.is(node)) {
            return <div className='sketch-folder-icon'></div>;
        }
        const icon = this.toNodeIcon(node);
        if (icon) {
            return <div className={icon + ' file-icon'}></div>;
        }
        // eslint-disable-next-line no-null/no-null
        return null;
    }

}
