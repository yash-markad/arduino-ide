import { injectable } from 'inversify';
import { AbstractViewContribution } from '@theia/core/lib/browser/shell/view-contribution';
import { FrontendApplicationContribution } from '@theia/core/lib/browser/frontend-application';
import { SketchbookWidget } from './sketchbook-widget';

@injectable()
export class SketchbookWidgetFrontendContribution extends AbstractViewContribution<SketchbookWidget> implements FrontendApplicationContribution {

    constructor() {
        super({
            widgetId: SketchbookWidget.WIDGET_ID,
            widgetName: SketchbookWidget.WIDGET_LABEL,
            defaultWidgetOptions: {
                area: 'left',
                rank: 100
            },
            toggleCommandId: `${SketchbookWidget.WIDGET_ID}:toggle`,
            toggleKeybinding: 'CtrlCmd+Shift+K'
        });
    }

    async initializeLayout(): Promise<void> {
        this.openView();
    }

}
