import { inject, injectable } from 'inversify';
import URI from '@theia/core/lib/common/uri';
import { FileService } from '@theia/filesystem/lib/browser/file-service';
import { MessageService } from '@theia/core/lib/common/message-service';
import { WorkspaceService } from '@theia/workspace/lib/browser/workspace-service';
import { Sketch, SketchesService } from '../../common/protocol';

@injectable()
export class SketchesServiceClientImpl {

    @inject(FileService)
    protected readonly fileService: FileService;

    @inject(MessageService)
    protected readonly messageService: MessageService;

    @inject(SketchesService)
    protected readonly sketchesService: SketchesService;

    @inject(WorkspaceService)
    protected readonly workspaceService: WorkspaceService;

    async currentSketch(url: URL = new URL(window.location.href)): Promise<Sketch | undefined> {
        const searchParams = url.searchParams;
        if (!searchParams) {
            return undefined;
        }
        const sketchUri = searchParams.get('sketchUri');
        if (!sketchUri) {
            return undefined;
        }
        try {
            const sketch = await this.sketchesService.loadSketch(sketchUri);
            return sketch;
        } catch {
            return undefined;
        }
    }

    async currentSketchFile(): Promise<string | undefined> {
        const sketch = await this.currentSketch();
        if (sketch) {
            const uri = sketch.mainFileUri;
            const exists = await this.fileService.exists(new URI(uri));
            if (!exists) {
                this.messageService.warn(`Could not find main sketch file: ${uri} in sketch: ${sketch.name} | ${sketch.uri}`);
                return undefined;
            }
            return uri;
        }
        return undefined;
    }

}
