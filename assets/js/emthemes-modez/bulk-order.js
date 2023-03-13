import $ from 'jquery';
import utils from '@bigcommerce/stencil-utils';
import swal from '../theme/global/sweet-alert';

//
// https://javascript.info/task/delay-promise
//
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

//
// https://hackernoon.com/functional-javascript-resolving-promises-sequentially-7aac18c4431e
//
function promiseSerial(funcs) {
    return funcs.reduce(
        (promise, func) => promise.then(result => func().then(Array.prototype.concat.bind(result))),
        Promise.resolve([])
    );
}

export class BulkOrder {
    constructor(context, $scope) {
        this.context = context || {};
        this.$body = $('body');
        this.$scope = $scope;
        this.itemCount = 0;
        this.progressCurrent = 0;
        this.progressTotal = 0;

        this.onQuantityChange = this.onQuantityChange.bind(this);
        this.onQuantityButtonClick = this.onQuantityButtonClick.bind(this);
        this.onProductAdded = this.onProductAdded.bind(this);
        this.onAddAllClick = this.onAddAllClick.bind(this);
        this.onCartQtyChange = this.onCartQtyChange.bind(this);
        this.onProgressPopupCloseClick = this.onProgressPopupCloseClick.bind(this);

        this.reinit();

        // Supermarket
        $('body').on('beforeload.instantload', () => this.unbindEvents());
    }

    reinit() {
        this.$progressPopup = $('.bulkOrder-progressModal', this.$scope);
        this.$progressPopupCurrent = $('.bulkOrder-progressModal-current', this.$scope);
        this.$progressPopupActions = $('.bulkOrder-progressModal-actions', this.$scope);
        this.$progressPopupClose = $('[data-close]', this.$scope);

        this.unbindEvents();
        this.bindEvents();

        this.calculate();
        this.updateQtyInCart();
    }

    bindEvents() {
        this.$scope.on('change', '[data-bulkorder-qty-id]', this.onQuantityChange);
        this.$scope.on('click', '[data-quantity-change] button', this.onQuantityButtonClick);
        this.$scope.on('click', '[data-bulkorder-add-all]', this.onAddAllClick);
        this.$body.on('ajax-addtocart-item-added', this.onProductAdded);
        this.$body.on('cart-quantity-update', this.onCartQtyChange);
        this.$progressPopupClose.on('click', this.onProgressPopupCloseClick);
    }

    unbindEvents() {
        this.$scope.off('change', '[data-bulkorder-qty-id]', this.onQuantityChange);
        this.$scope.off('click', '[data-quantity-change] button', this.onQuantityButtonClick);
        this.$scope.off('click', '[data-bulkorder-add-all]', this.onAddAllClick);
        this.$body.off('ajax-addtocart-item-added', this.onProductAdded);
        this.$body.off('cart-quantity-update', this.onCartQtyChange);
        this.$progressPopupClose.off('click', this.onProgressPopupCloseClick);
    }

    onProgressPopupCloseClick(event) {
        event.preventDefault();
        this.hideProgressPopup();
    }

    onCartQtyChange() {
        this.updateQtyInCart();
    }

    showProgressPopup() {
        this.$progressPopupActions.addClass('u-hiddenVisually');
        this.$progressPopup.addClass('is-open');
    }

    hideProgressPopup() {
        this.$progressPopupCurrent.css('width', 0);
        this.$progressPopupActions.addClass('u-hiddenVisually');
        this.$progressPopup.removeClass('is-open');
    }

    updateProgressPopup() {
        if (this.progressTotal > 0) {
            this.$progressPopupCurrent.css('width', `${this.progressCurrent / this.progressTotal * 100}%`);
        } else {
            this.$progressPopupCurrent.css('width', 0);
        }
    }

    showProgressPopupActions() {
        this.$progressPopupActions.removeClass('u-hiddenVisually');
    }

    onAddAllClick(event) {
        event.preventDefault();

        if (this.itemCount === 0) {
            swal.fire({
                text: this.context.bulkOrderEnterQty || 'Please enter product quantity',
                icon: 'error',
            });
            return;
        }

        this.addAllProducts();
    }

    onProductAdded(event, productId) {
        this.$scope.find(`[data-bulkorder-qty-id='${productId}']`).val(0);
        this.calculate();
    }

    onQuantityButtonClick(event) {
        event.preventDefault();
        const $target = $(event.currentTarget);
        const $input = $target.closest('[data-quantity-change]').find('input');
        const quantityMin = parseInt($input.data('quantityMin'), 10);
        const quantityMax = parseInt($input.data('quantityMax'), 10);

        let qty = parseInt($input.val(), 10);

        // If action is incrementing
        if ($target.data('action') === 'inc') {
            // If quantity max option is set
            if (quantityMax > 0) {
                // Check quantity does not exceed max
                if ((qty + 1) <= quantityMax) {
                    qty++;
                }
            } else {
                qty++;
            }
        } else if (qty > 0) {
            // If quantity min option is set
            if (quantityMin > 0) {
                // Check quantity does not fall below min
                if ((qty - 1) >= quantityMin) {
                    qty--;
                } else {
                    qty = 0;
                }
            } else {
                qty--;
            }
        }

        $input.val(qty);

        this.calculate();
    }

    onQuantityChange() {
        this.calculate();
    }

    calculate() {
        let format = '';
        let total = 0;
        let count = 0;

        this.$scope.find('[data-bulkorder-qty-id]').each((i, el) => {
            const $input = $(el);
            const qty = parseInt($input.val(), 10);
            const productId = $input.data('bulkorderQtyId');
            const $price = this.$scope.find(`[data-bulkorder-price-id='${productId}']`);
            const priceVal = parseFloat($price.data('bulkorderPriceValue'));
            const priceFmt = `${$price.data('bulkorderPriceFormatted')}`;
            const subtotal = Math.round(priceVal * qty * 100) / 100;
            const $subtotal = this.$scope.find(`[data-bulkorder-subtotal-id='${productId}']`);
            $subtotal.html(priceFmt.replace(/[0-9.,]+/, subtotal));

            format = priceFmt;
            total += subtotal;
            count += qty;
        });

        this.itemCount = count;

        this.$scope.find('[data-bulkorder-total-count]').html(count);
        this.$scope.find('[data-bulkorder-total-amount]').html(format.replace(/[0-9.,]+/, Math.round(total * 100) / 100));
    }

    addAllProducts() {
        const promises = [];
        this.progressCurrent = 0;

        this.$scope.find('[data-bulkorder-qty-id]').each((i, el) => {
            const $input = $(el);
            const qty = parseInt($input.val(), 10);
            const productId = $input.data('bulkorderQtyId');

            if (qty > 0) {
                promises.push(async () => {
                    this.progressCurrent++;
                    this.updateProgressPopup();

                    await this.addProduct(productId, qty); // eslint-disable-line no-unused-expressions

                    $input.val(0);
                    this.calculate();

                    // wait 1s before adding to cart a new item in order to avoid request failed.
                    await delay(1000); // eslint-disable-line no-unused-expressions
                });
            }
        });

        this.progressTotal = promises.length;
        this.showProgressPopup();

        promiseSerial(promises).then(() => {
            this.showProgressPopupActions();
            // this.updateQtyInCart();
            this.updateCartCounter();
        });
    }

    async addProduct(productId, qty) {
        // Do not do AJAX if browser doesn't support FormData
        if (window.FormData === undefined) {
            return;
        }

        const formData = new FormData();
        formData.append('product_id', productId);
        formData.append('qty[]', qty);

        const promise = new Promise((resolve) => {
            utils.api.cart.itemAdd(formData, (err, response) => {
                const errorMessage = err || response.data.error;

                // Guard statement
                if (errorMessage) {
                    // Strip the HTML from the error message
                    const tmp = document.createElement('DIV');
                    tmp.innerHTML = errorMessage;

                    alert(tmp.textContent || tmp.innerText);
                }

                resolve();
            });
        });

        await promise; // eslint-disable-line no-unused-expressions
    }

    updateQtyInCart() {
        $.get('/api/storefront/cart', data => {
            if (!data.length) {
                return;
            }

            const qtys = {};

            data[0].lineItems.physicalItems.forEach(item => {
                if (typeof qtys[item.productId] !== 'undefined') {
                    qtys[item.productId] += item.quantity;
                } else {
                    qtys[item.productId] = item.quantity;
                }
            });

            $('[data-bulkorder-cart-qty-id]', this.$scope).each((i, el) => {
                const $el = $(el);
                const productId = parseInt($el.data('bulkorderCartQtyId'), 10);
                if (qtys[productId]) {
                    $el.html(qtys[productId]);
                } else {
                    $el.html('0');
                }
            });
        });
    }

    updateCartCounter() {
        utils.api.cart.getContent({ template: 'cart/preview' }, (err, resp) => {
            if (err) {
                return;
            }

            // Update cart counter
            const $body = $('body');
            const $cartQuantity = $('[data-cart-quantity]', resp);
            const $cartCounter = $('.navUser-action .cart-count');
            const quantity = $cartQuantity.data('cart-quantity') || 0;

            $cartCounter.addClass('cart-count--positive');
            $body.trigger('cart-quantity-update', quantity);
        });
    }
}

export default function bulkOrderFactory(context = null, selector = '#product-listing-container') {
    const $selector = $(selector);
    let bulkOrder = $selector.data('bulkOrderInstance');

    if (!(bulkOrder instanceof BulkOrder)) {
        bulkOrder = new BulkOrder(context, $selector);
        $selector.data('bulkOrderInstance', bulkOrder);
    }

    return bulkOrder;
}
