import { injectable, inject } from 'inversify';
import { deepClone, notEmpty } from '@theia/core/lib/common/objects';
import { FrontendApplicationContribution, LocalStorageService } from '@theia/core/lib/browser';
import { BoardsService, ConfigOption } from '../../common/protocol';
import { BoardsServiceClientImpl } from './boards-service-client-impl';

@injectable()
export class BoardsConfigStore implements FrontendApplicationContribution {

    @inject(BoardsService)
    protected readonly boardsService: BoardsService;

    @inject(BoardsServiceClientImpl)
    protected readonly boardsServiceClient: BoardsServiceClientImpl;

    @inject(LocalStorageService)
    protected readonly storageService: LocalStorageService;

    onStart(): void {
        this.boardsServiceClient.onBoardInstalled(({ pkg }) => pkg.boards.map(({ fqbn }) => fqbn).filter(notEmpty).forEach(this.getConfig.bind(this)));
    }

    async appendConfigToFqbn(fqbn: string, ): Promise<string> {
        const configOptions = await this.getConfig(fqbn);
        return ConfigOption.decorate(fqbn, configOptions);
    }

    async getConfig(fqbn: string): Promise<ConfigOption[]> {
        const key = this.getStorageKey(fqbn);
        let configOptions = await this.storageService.getData<ConfigOption[] | undefined>(key, undefined);
        if (configOptions) {
            return configOptions;
        }
        const details = await this.boardsService.getBoardDetails({ fqbn });
        configOptions = details.configOptions;
        await this.storageService.setData(key, configOptions);
        return configOptions;
    }

    async setSelected({ fqbn, option, selectedValue }: { fqbn: string, option: string, selectedValue: string }): Promise<boolean> {
        const configOptions = deepClone(await this.getConfig(fqbn));
        const configOption = configOptions.find(c => c.option === option);
        if (!configOption) {
            return false;
        }
        let updated = false;
        for (const value of configOption.values) {
            if (value.value === selectedValue) {
                (value as any).selected = true;
                updated = true;
            } else {
                (value as any).selected = false;
            }
        }
        if (!updated) {
            return false;
        }
        await this.setConfig({ fqbn, configOptions });
        return true;
    }

    protected async setConfig({ fqbn, configOptions }: { fqbn: string, configOptions: ConfigOption[] }): Promise<void> {
        const key = this.getStorageKey(fqbn);
        return this.storageService.setData(key, configOptions);
    }

    protected getStorageKey(fqbn: string): string {
        return `.arduinoProIDE-configOptions-${fqbn}`;
    }

}
