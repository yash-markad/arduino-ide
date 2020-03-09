import { injectable } from 'inversify';
import { FrontendApplication } from '@theia/core/lib/browser';
import { BrowserMenuContribution } from '@theia/core/lib/browser/menu/browser-menu-contribution';

@injectable()
export class ArduinoMenuContribution extends BrowserMenuContribution {

    onStart(app: FrontendApplication): void {
        super.onStart(app);
        const menu = this.factory.createMenuBar();
        app.shell.addWidget(menu, { area: 'top' });
    }

}
