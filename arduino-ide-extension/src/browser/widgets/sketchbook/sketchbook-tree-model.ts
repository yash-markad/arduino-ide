import { inject, injectable } from 'inversify';
import URI from '@theia/core/lib/common/uri';
import { FileNode, FileTreeModel } from '@theia/filesystem/lib/browser';
import { FileService } from '@theia/filesystem/lib/browser/file-service';
import { ConfigService } from '../../../common/protocol';
import { SketchbookTree } from './sketchbook-tree';
import { ArduinoPreferences } from '../../arduino-preferences';
import {
    ExpandableTreeNode,
    SelectableTreeNode,
    TreeNode,
} from '@theia/core/lib/browser/tree';
import { SketchbookCommands } from './sketchbook-commands';
import { OpenerService, open } from '@theia/core/lib/browser';
import { SketchesServiceClientImpl } from '../../../common/protocol/sketches-service-client-impl';
import { CommandRegistry } from '@theia/core/lib/common/command';

@injectable()
export class SketchbookTreeModel extends FileTreeModel {
    @inject(FileService)
    protected readonly fileService: FileService;

    @inject(ArduinoPreferences)
    protected readonly arduinoPreferences: ArduinoPreferences;

    @inject(CommandRegistry)
    protected readonly commandRegistry: CommandRegistry;

    @inject(ConfigService)
    protected readonly configService: ConfigService;

    @inject(OpenerService)
    protected readonly openerService: OpenerService;

    @inject(SketchesServiceClientImpl)
    protected readonly sketchServiceClient: SketchesServiceClientImpl;

    async updateRoot(): Promise<void> {
        const config = await this.configService.getConfiguration();
        const fileStat = await this.fileService.resolve(
            new URI(config.sketchDirUri)
        );
        const showAllFiles =
            this.arduinoPreferences['arduino.sketchbook.showAllFiles'];
        this.tree.root = SketchbookTree.RootNode.create(fileStat, showAllFiles);
    }

    // selectNode gets called when the user single-clicks on an item
    // when this happens, we want to open the file if it belongs to the currently open sketch
    async selectNode(node: Readonly<SelectableTreeNode>): Promise<void> {
        super.selectNode(node);
        if (FileNode.is(node) && (await this.isFileInsideCurrentSketch(node))) {
            this.open(node.uri);
        }
    }

    public open(uri: URI): void {
        open(this.openerService, uri);
    }

    protected async doOpenNode(node: TreeNode): Promise<void> {
        // if it's a sketch dir, or a file from another sketch, open in new window
        if (!(await this.isFileInsideCurrentSketch(node))) {
            const sketchRoot = this.recursivelyFindSketchRoot(node);
            if (sketchRoot) {
                this.commandRegistry.executeCommand(
                    SketchbookCommands.OPEN_NEW_WINDOW.id,
                    { node: sketchRoot }
                );
            }
            return;
        }

        if (node.visible === false) {
            return;
        } else if (FileNode.is(node)) {
            this.open(node.uri);
        } else {
            super.doOpenNode(node);
        }
    }

    private async isFileInsideCurrentSketch(node: TreeNode): Promise<boolean> {
        // it's a directory, not a file
        if (!FileNode.is(node)) {
            return false;
        }

        // check if the node is a file that belongs to another sketch
        const sketch = await this.sketchServiceClient.currentSketch();
        if (sketch && node.uri.toString().indexOf(sketch.uri) !== 0) {
            return false;
        }
        return true;
    }

    protected recursivelyFindSketchRoot(node: TreeNode): TreeNode | false {
        if (node && SketchbookTree.SketchDirNode.is(node)) {
            return node;
        }

        if (node && node.parent) {
            return this.recursivelyFindSketchRoot(node.parent);
        }

        // can't find a root, return false
        return false;
    }

    /**
     * Reveals node in the navigator by given file uri.
     *
     * @param uri uri to file which should be revealed in the navigator
     * @returns file tree node if the file with given uri was revealed, undefined otherwise
     */
    async revealFile(uri: URI): Promise<TreeNode | undefined> {
        if (!uri.path.isAbsolute) {
            return undefined;
        }
        let node = this.getNodeClosestToRootByUri(uri);

        if (!node) {
            // shouldn't happen, node should exist
            return undefined;
        }

        // success stop condition
        // we have to reach workspace root because expanded node could be inside collapsed one
        if (SketchbookTree.RootNode.is(node)) {
            if (ExpandableTreeNode.is(node)) {
                if (!node.expanded) {
                    node = await this.expandNode(node);
                }
                return node;
            }
            // shouldn't happen, root node is always directory, i.e. expandable
            return undefined;
        }

        // fail stop condition
        if (uri.path.isRoot) {
            // file system root is reached but workspace root wasn't found, it means that
            // given uri is not in workspace root folder or points to not existing file.
            return undefined;
        }

        if (await this.revealFile(uri.parent)) {
            if (node === undefined) {
                // get node if it wasn't mounted into navigator tree before expansion
                node = this.getNodeClosestToRootByUri(uri);
            }
            if (ExpandableTreeNode.is(node) && !node.expanded) {
                node = await this.expandNode(node);
            }
            return node;
        }
        return undefined;
    }

    protected getNodeClosestToRootByUri(uri: URI): TreeNode | undefined {
        const nodes = [...this.getNodesByUri(uri)];
        console.log('-------------');
        console.log(uri);
        console.log(uri.toString);
        console.log('-------------');
        return nodes.length > 0
            ? nodes.reduce(
                  (
                      node1,
                      node2 // return the node closest to the workspace root
                  ) => (node1.id.length >= node2.id.length ? node1 : node2)
              )
            : undefined;
    }
}
