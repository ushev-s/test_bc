import './global/jquery-migrate';
import './common/select-option-plugin';
import PageManager from '../page-manager';
import quickSearch from './global/quick-search';
import currencySelector from './global/currency-selector';
import mobileMenuToggle from './global/mobile-menu-toggle';
import menu from './global/menu';
import foundation from './global/foundation';
import quickView from './global/quick-view';
import cartPreview from './global/cart-preview';
import privacyCookieNotification from './global/cookieNotification';
import maintenanceMode from './global/maintenanceMode';
import carousel from './common/carousel';
import svgInjector from './global/svg-injector';

// emthemesModez added
import emthemesModez from '../emthemes-modez/theme';

export default class Global extends PageManager {
    onReady() {
        const {
            cartId,
        } = this.context;
        cartPreview(this.context.secureBaseUrl, this.context.cartId);
        quickSearch();
        currencySelector(cartId);
        foundation($(document));
        quickView(this.context);
        carousel();
        menu();
        mobileMenuToggle();
        privacyCookieNotification();
        maintenanceMode(this.context.maintenanceMode);
        emthemesModez(this.context); // emthemesModez added
        svgInjector();
    }
}
