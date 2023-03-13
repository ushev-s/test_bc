import $ from 'jquery';
import utils from '@bigcommerce/stencil-utils';
import modalFactory, { ModalEvents } from '../theme/global/modal';
import Cookies from 'js-cookie';

let singletonModal;

/**
 * Create and return Modal object used for showing newsletter
 */
function getModal() {
    if (!singletonModal) {
        singletonModal = modalFactory('#newsletterPopupModal')[0];
        singletonModal.$modal
            .on(ModalEvents.open, () => {
                $('body').addClass('has-activeModal--newsletter');
            })
            .on(ModalEvents.closed, () => {
                $('body').removeClass('has-activeModal--newsletter');
            });

        singletonModal.$content.on('change', 'input[name=hide]', (event) => {
            const $el = $(event.target);
            if ($el.prop('checked')) {
                Cookies.set('NL_POPUP_HIDE', 1, { expires: 1 });
            } else {
                Cookies.remove('NL_POPUP_HIDE');
            }
        });
    }
    return singletonModal;
}

/**
 * Show newsletter popup
 *
 * @param {object} context
 */
function showPopup(context) {
    utils.api.getPage(`${context.urls.search}?search_query=&section=content`, { template: 'emthemes-modez/newsletter/popup-banner' }, (err, resp) => {
        const modal = getModal();
        modal.updateContent(resp);
        modal.$content.find('#newsletterPopup-form-placeholder').empty().append(modal.$content.find('#newsletterPopup-form'));
        modal.open({ size: 'small', pending: false, clearContent: false });
    });
}

/**
 * Don't show popup for subscribed user within 7 days
 */
export function hideForSubscribed() {
    Cookies.set('NL_POPUP_HIDE', 1, { expires: 7 });
}

/**
 * Check and show newsletter popup if need
 *
 * @param {object} context
 */
export default function (context) {
    if (!Cookies.get('NL_POPUP_HIDE')) {
        let last = parseInt(Cookies.get('NL_POPUP_LAST'), 10);
        if (Number.isNaN(last)) {
            last = 0;
        }

        let hideSec = parseInt(context.themeSettings.nl_popup_hide, 10);
        if (Number.isNaN(hideSec)) {
            hideSec = 0;
        }

        if (last === 0 || hideSec === 0 || last + hideSec * 1000 <= Date.now()) {
            let waitSec = parseInt(context.themeSettings.nl_popup_start, 10);
            if (Number.isNaN(waitSec)) {
                waitSec = 0;
            }

            setTimeout(() => {
                if (!Cookies.get('NL_POPUP_HIDE')) {
                    Cookies.set('NL_POPUP_LAST', Date.now(), { expires: 1 });
                    showPopup(context);
                }
            }, waitSec * 1000);
        }
    }
}
