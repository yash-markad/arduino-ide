import { injectable, inject } from 'inversify';
import { CommandService } from '@theia/core/lib/common/command';
import { FrontendApplication as TheiaFrontendApplication } from '@theia/core/lib/browser/frontend-application';
import { SketchesService, Sketch } from '../../../common/protocol';
import { OpenSketch } from '../../contributions/open-sketch';

@injectable()
export class FrontendApplication extends TheiaFrontendApplication {

    @inject(CommandService)
    protected readonly commandService: CommandService;

    @inject(SketchesService)
    protected readonly sketchesService: SketchesService;

    protected async initializeLayout(): Promise<void> {
        const [sketch] = await Promise.all([
            this.sketch(),
            super.initializeLayout()
        ]);
        if (sketch) {
            await this.commandService.executeCommand(OpenSketch.Commands.OPEN_SKETCH_FILES.id, sketch);
        }
    }

    protected async sketch(url: URL = new URL(window.location.href)): Promise<Sketch | undefined> {
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

}
