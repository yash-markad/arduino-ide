import { inject, injectable } from 'inversify';
import URI from '@theia/core/lib/common/uri';
import { FileTreeModel } from '@theia/filesystem/lib/browser';
import { FileService } from '@theia/filesystem/lib/browser/file-service';
import { ConfigService } from '../../../common/protocol';
import { SketchbookTree } from './sketchbook-tree';
import { ArduinoPreferences } from '../../arduino-preferences';

@injectable()
export class SketchbookTreeModel extends FileTreeModel {

    @inject(FileService)
    protected readonly fileService: FileService;

    @inject(ArduinoPreferences)
    protected readonly arduinoPreferences: ArduinoPreferences;

    @inject(ConfigService)
    protected readonly configService: ConfigService;

    async updateRoot(): Promise<void> {
        const config = await this.configService.getConfiguration();
        const fileStat = await this.fileService.resolve(new URI(config.sketchDirUri));
        const showAllFiles = this.arduinoPreferences['arduino.sketchbook.showAllFiles'];
        this.tree.root = SketchbookTree.RootNode.create(fileStat, showAllFiles);
    }

}
