import $ from 'jquery';
import utils from '@bigcommerce/stencil-utils';
import modalFactory, { ModalEvents } from '../theme/global/modal';
import swal from '../theme/global/sweet-alert';

// Supermarket - OBPS Mod
/* eslint-disable */
function shake($el, settings) {
    if (typeof settings === 'undefined') {
        settings = {};
    }

    if (typeof settings.interval === 'undefined') {
        settings.interval = 100;
    }

    if (typeof settings.distance === 'undefined') {
        settings.distance = 10;
    }

    if (typeof settings.times === 'undefined') {
        settings.times = 4;
    }

    if (typeof settings.complete === 'undefined') {
        settings.complete = function () {};
    }

    $el.css('position', 'relative');

    for (let iter = 0; iter < (settings.times + 1); iter++) {
        $el.animate({ left: ((iter % 2 === 0 ? settings.distance : settings.distance * -1)) }, settings.interval);
    }

    $el.animate({ left: 0 }, settings.interval, settings.complete);
}
/* eslint-enable */

function onMiniPreviewModalOpen() {
    $('body').addClass('has-activeModal--miniPreview');
}

function onMiniPreviewModalClose() {
    $('body').removeClass('has-activeModal--miniPreview');
    if (typeof this.autoCloseTimer !== 'undefined' && this.autoCloseTimer) {
        window.clearInterval(this.autoCloseTimer);
        this.autoCloseTimer = null;
    }
}

function applyModalAutoClose(modal) {
    const $autoCloseEl = modal.$modal.find('[data-auto-close]');
    if ($autoCloseEl.length > 0) {
        let sec = $autoCloseEl.data('autoClose') || 5;
        const $count = $autoCloseEl.find('.count');
        $count.html(sec);

        modal.autoCloseTimer = window.setInterval(() => { // eslint-disable-line
            if (sec > 1) {
                sec--;
                $count.html(sec);
            } else {
                modal.autoCloseTimer = null; // eslint-disable-line
                modal.close();
                modal.close();
            }
        }, 1000);
    }
}

/**
 * Get URL Parameter
 *
 * @param  {String} Parameter name
 * @param  {String} URL
 * @return {String} return string value or 0 if not exist
 */
function getURLParam(name, url) {
    const results = new RegExp(`[\?&]${name}=([^&#]*)`).exec(url);
    return results[1] || 0;
}

/**
 * Get cart contents
 *
 * @param {String} cartItemHash
 * @param {Function} onComplete
 */
function getCartContent(cartItemHash, onComplete) {
    const options = {
        template: 'cart/preview',
        params: {
            suggest: cartItemHash,
        },
        config: {
            cart: {
                suggestions: {
                    limit: 4,
                },
            },
        },
    };

    utils.api.cart.getContent(options, onComplete);
}

/**
 * Update cart content
 *
 * @param {String} cartItemHash
 */
function updateCartContent(modal, cartItemHash) {
    getCartContent(cartItemHash, (err, response) => {
        if (err) {
            return;
        }

        modal.updateContent(response);
        applyModalAutoClose(modal); // Supermarket

        // Update cart counter
        const $body = $('body');
        const $cartQuantity = $('[data-cart-quantity]', modal.$content);
        const $cartCounter = $('.navUser-action .cart-count');
        const quantity = $cartQuantity.data('cart-quantity') || 0;

        $cartCounter.addClass('cart-count--positive');
        $body.trigger('cart-quantity-update', quantity);

        // Supermarket - OBPS Mod
        shake($('.navUser-item--cart > .navUser-action'));
    });
}

/**
 * Checks if the current window is being run inside an iframe
 * @returns {boolean}
 */
function isRunningInIframe() {
    try {
        return window.self !== window.top;
    } catch (e) {
        return true;
    }
}

/**
 * Redirect to url
 *
 * @param {String} url
 */
function redirectTo(url) {
    if (isRunningInIframe() && !window.iframeSdk) {
        window.top.location = url;
    } else {
        window.location = url;
    }
}

export default function (context) {
    const modal = modalFactory('#previewModal')[0];

    modal.$modal.addClass('preview-modal').addClass(`preview-modal--${context.themeSettings.add_to_cart_popup}`);
    if (context.themeSettings.add_to_cart_popup === 'mini') {
        // unbind open/close event of the original modal
        modal.$modal.off(ModalEvents.open, modal.onModalOpen);
        modal.$modal.off(ModalEvents.close, modal.onModalClose);

        // bind open/class event for mini preview modal
        modal.onModalOpen = onMiniPreviewModalOpen.bind(modal);
        modal.onModalClose = onMiniPreviewModalClose.bind(modal);
        modal.$modal.on(ModalEvents.open, modal.onModalOpen);
        modal.$modal.on(ModalEvents.close, modal.onModalClose);
    }

    $('body').on('click', '[data-emthemesmodez-cart-item-add]', (event) => {
        // Do not do AJAX if browser doesn't support FormData
        if (window.FormData === undefined) {
            return;
        }

        event.preventDefault();

        const productId = getURLParam('product_id', event.target.href);
        if (productId === 0) {
            return;
        }

        const formData = new FormData();
        formData.append('product_id', productId);

        const $form = $(event.target).closest('form');
        const qty = $form.find(`input[name=qty_${productId}]`).val();
        if (qty && qty.length > 0) {
            if (parseInt(qty, 10) > 0) {
                formData.append('qty[]', qty);
            } else if ($(event.target).is('[data-check-qty]')) {
                swal.fire({
                    text: context.ajaxAddToCartEnterQty || 'Please enter quantity',
                    icon: 'error',
                });
                return;
            }
        }

        // Add item to cart
        utils.api.cart.itemAdd(formData, (err, response) => {
            const errorMessage = err || response.data.error;

            // Guard statement
            if (errorMessage) {
                // Strip the HTML from the error message
                const tmp = document.createElement('DIV');
                tmp.innerHTML = errorMessage;

                alert(tmp.textContent || tmp.innerText);

                return;
            }

            // Papathemes - Supermarket: Support redirect to cart page after added to cart
            if (context.themeSettings.redirect_cart) {
                redirectTo(response.data.cart_item.cart_url || context.urls.cart);
                return;
            }

            // Supermarket - OBPS Mod
            // Open preview modal and update content
            if (context.themeSettings.add_to_cart_popup !== 'hide') {
                modal.open();
                modal.open({ size: 'large' });
            }

            $('body').trigger('ajax-addtocart-item-added', productId);

            updateCartContent(modal, response.data.cart_item.hash);
        });
    });
}
