import { injectable } from 'inversify';
import { ViewContainer } from '@theia/core/lib/browser/view-container';
import { Disposable } from '@theia/core/lib/common/disposable';

@injectable()
export class SketchbookViewContainer extends ViewContainer {

    registerDND(): Disposable {
        return Disposable.NULL;
    }

}

export const SketchbookViewContainerFactory = Symbol('SketchbookViewContainerFactory');
export interface SketchbookViewContainerFactory extends ViewContainer.Factory {
}
