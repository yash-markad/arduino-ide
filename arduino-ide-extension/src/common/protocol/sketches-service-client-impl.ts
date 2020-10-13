import { inject, injectable } from 'inversify';
import URI from '@theia/core/lib/common/uri';
import { FileService } from '@theia/filesystem/lib/browser/file-service';
import { MaybePromise } from '@theia/core/lib/common/types';
import { MessageService } from '@theia/core/lib/common/message-service';
import { StorageService } from '@theia/core/lib/browser/storage-service';
import { Sketch, SketchesService } from '../../common/protocol';

@injectable()
export class SketchesServiceClientImpl {

    @inject(FileService)
    protected readonly fileService: FileService;

    @inject(MessageService)
    protected readonly messageService: MessageService;

    @inject(SketchesService)
    protected readonly sketchesService: SketchesService;

    @inject(StorageService)
    protected readonly storageService: StorageService;

    async currentSketch(url: URL = new URL(window.location.href)): Promise<Sketch | undefined> {
        let sketchUri: string | undefined = url.searchParams.get('sketchUri') || undefined;
        if (!sketchUri) {
            sketchUri = await this.getStoredSketchUri();
        }
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

    async currentSketchFile(s: MaybePromise<Sketch | undefined> = this.currentSketch()): Promise<string | undefined> {
        const sketch = await s;
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

    protected async getStoredSketchUri(): Promise<string | undefined> {
        const sketchUri = await this.storageService.getData<string>('current-sketch-uri');
        if (sketchUri) {
            try {
                const sketch = await this.sketchesService.loadSketch(sketchUri);
                const url = new URL(window.location.href);
                url.searchParams.delete('sketchUri');
                url.searchParams.set('sketchUri', sketch.uri.toString());
                window.history.pushState({}, '', url.toString());
                return sketch.uri;
            } catch { }
        }
        return undefined;
    }

    async storeSketchUri(s: MaybePromise<Sketch>): Promise<void> {
        const sketch = await s;
        const sketchFile = await this.currentSketchFile(sketch);
        if (sketchFile) {
            return this.storageService.setData('current-sketch-uri', sketch.uri);
        }
    }

}
