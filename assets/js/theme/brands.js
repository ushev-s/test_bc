import PageManager from '../page-manager';
import AZBrands from '../emthemes-modez/azbrands';

export default class Brands extends PageManager {
    onReady() {
        if (this.context.themeSettings.brandspage_layout === 'aztable') {
            const azbrands = new AZBrands();
            azbrands.onReady();
        }
    }
}
