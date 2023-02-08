/**
 * Add remove item button on Mini Cart Popup
 *
 * Copyright 2018 papathemes.com
 */

import $ from 'jquery';
import utils from '@bigcommerce/stencil-utils';

const loadingClass = 'is-loading';

function cartPreviewDropdown() {
    return $('#cart-preview-dropdown');
}

function showLoading() {
    const $cartDropdown = cartPreviewDropdown();
    const $cartLoading = $('<div class="loadingOverlay"></div>');

    if ($cartDropdown.hasClass(loadingClass)) {
        return;
    }

    $cartDropdown
        .addClass(loadingClass)
        .html($cartLoading);
    $cartLoading
        .show();
}

function refreshContent() {
    showLoading();

    utils.api.cart.getContent({ template: 'common/cart-preview' }, (err, response) => {
        cartPreviewDropdown()
            .removeClass(loadingClass)
            .html(response);

        const quantity = $('[data-cart-quantity]', cartPreviewDropdown()).data('cart-quantity') || 0;

        $('body').trigger('cart-quantity-update', quantity);
    });
}

function cartRemoveItem(itemId) {
    showLoading();

    utils.api.cart.itemRemove(itemId, (err, response) => {
        if (response.data.status === 'succeed') {
            refreshContent(true);
        } else {
            alert(response.data.errors.join('\n'));
        }
    });
}

export default function () {
    cartPreviewDropdown()
        .attr('aria-autoclose', 'false') // prevent close popup when click on inside
        .on('click', '[data-cart-remove]', (event) => {
            const itemId = $(event.currentTarget).data('cart-itemid');
            const openTime = new Date();
            // const result = confirm($(event.currentTarget).data('confirm-delete'));
            const result = true;
            const delta = new Date() - openTime;

            event.preventDefault();
            event.stopPropagation();

            // Delta workaround for Chrome's "prevent popup"
            if (!result && delta > 10) {
                return;
            }

            // remove item from cart
            cartRemoveItem(itemId);
        });
}
