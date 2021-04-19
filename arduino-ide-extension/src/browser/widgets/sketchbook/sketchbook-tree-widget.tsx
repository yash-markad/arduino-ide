import * as React from 'react';
import { inject, injectable, postConstruct } from 'inversify';
import URI from '@theia/core/lib/common/uri';
import { TreeNode } from '@theia/core/lib/browser/tree/tree';
import { CommandRegistry } from '@theia/core/lib/common/command';
import { NodeProps, TreeProps, TREE_NODE_SEGMENT_CLASS, TREE_NODE_TAIL_CLASS } from '@theia/core/lib/browser/tree/tree-widget';
import { EditorManager } from '@theia/editor/lib/browser/editor-manager';
import { FileTreeWidget } from '@theia/filesystem/lib/browser';
import { ContextMenuRenderer } from '@theia/core/lib/browser/context-menu-renderer';
import { ConfigService } from '../../../common/protocol';
import { SketchbookTree } from './sketchbook-tree';
import { SketchbookTreeModel } from './sketchbook-tree-model';
import { ArduinoPreferences } from '../../arduino-preferences';

@injectable()
export class SketchbookTreeWidget extends FileTreeWidget {

    @inject(CommandRegistry)
    protected readonly commandRegistry: CommandRegistry;

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
        return undefined;
    }

    protected renderTailDecorations(node: TreeNode, props: NodeProps): React.ReactNode {
        return <React.Fragment>
            {super.renderTailDecorations(node, props)}
            {this.renderInlineCommands(node, props)}
        </React.Fragment>
    }

    protected hoveredNodeId: string | undefined;
    protected setHoverNodeId(id: string | undefined): void {
        this.hoveredNodeId = id;
        this.update();
    }

    protected createNodeAttributes(node: TreeNode, props: NodeProps): React.Attributes & React.HTMLAttributes<HTMLElement> {
        return {
            ...super.createNodeAttributes(node, props),
            onMouseOver: () => this.setHoverNodeId(node.id),
            onMouseOut: () => this.setHoverNodeId(undefined)
        };
    }

    protected renderInlineCommands(node: TreeNode, props: NodeProps): React.ReactNode {
        if (SketchbookTree.SketchDirNode.is(node) && node.commands && node.id === this.hoveredNodeId) {
            return Array.from(new Set(node.commands)).map(command => this.renderInlineCommand(command.id, node));
        }
        return undefined;
    }

    protected renderInlineCommand(commandId: string, arg: SketchbookTree.SketchDirNode): React.ReactNode {
        const command = this.commandRegistry.getCommand(commandId);
        const icon = command?.iconClass;
        if (command && icon && this.commandRegistry.isEnabled(commandId, arg) && this.commandRegistry.isVisible(commandId, arg)) {
            const className = [TREE_NODE_SEGMENT_CLASS, TREE_NODE_TAIL_CLASS, icon, 'theia-tree-view-inline-action'].join(' ');
            return <div
                key={`${commandId}--${arg.id}`}
                className={className}
                title={command?.label || command.id}
                onClick={() => this.commandRegistry.executeCommand(commandId, arg)}
            />;
        }
        return undefined;
    }

}
