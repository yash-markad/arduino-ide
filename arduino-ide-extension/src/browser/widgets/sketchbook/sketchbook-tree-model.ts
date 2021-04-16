import { inject, injectable } from 'inversify';
import URI from '@theia/core/lib/common/uri';
import { FileTreeModel } from '@theia/filesystem/lib/browser';
import { FileService } from '@theia/filesystem/lib/browser/file-service';
import { SketchbookTree } from './sketchbook-tree';
import { ArduinoPreferences } from '../../arduino-preferences';

@injectable()
export class SketchbookTreeModel extends FileTreeModel {

    @inject(FileService)
    protected readonly fileService: FileService;

    @inject(ArduinoPreferences)
    protected readonly arduinoPreferences: ArduinoPreferences;

    async initialize({ sketchDirUri }: { sketchDirUri: URI | string }): Promise<void> {
        const uri = sketchDirUri instanceof URI ? sketchDirUri : new URI(sketchDirUri);
        const fileStat = await this.fileService.resolve(uri);
        const showAllFiles = this.arduinoPreferences['arduino.sketchbook.showAllFiles'];
        this.tree.root = SketchbookTree.RootNode.create(fileStat, showAllFiles);
    }

}
