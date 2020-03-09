import { BrowserMenuContribution } from '@theia/core/lib/browser/menu/browser-menu-contribution';
import { ArduinoMenuContribution } from './arduino-menu-contribution';
import { ContainerModule } from 'inversify';

import '../../../src/browser/style/browser-menu.css'

export default new ContainerModule((bind, unbind, isBound, rebind) => {
    rebind(BrowserMenuContribution).to(ArduinoMenuContribution).inSingletonScope();
});
