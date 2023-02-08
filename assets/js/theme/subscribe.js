// Supermarket Theme: Implement for newsletter popup

import PageManager from '../page-manager';
import Url from 'url';
import { hideForSubscribed } from '../emthemes-modez/newsletter-popup';

export default class Subscribe extends PageManager {
    loaded(next) {
        if (this.context.themeSettings.nl_popup_show !== '' && this.context.themeSettings.nl_popup_show !== 'hide') {
            const url = Url.parse(location.href, true);
            if (url.query.result === 'success') {
                hideForSubscribed();
            }
        }
        next();
    }
}
