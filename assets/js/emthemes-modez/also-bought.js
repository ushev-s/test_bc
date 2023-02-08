import $ from 'jquery';
import _ from 'lodash';
import utils from '@bigcommerce/stencil-utils';
import collapsibleFactory from '../theme/common/collapsible';
import ProductDetails from '../theme/common/product-details';
import scrollToElement from 'scroll-to-element';

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
        Promise.resolve([]),
    );
}

export default class AlsoBought {
    constructor(parentProductDetails) {
        this.parentProductDetails = parentProductDetails;
        this.$alsoBoughtEl = $('[data-also-bought]', parentProductDetails.$productViewScope);
        this.$alsoBoughtEl.data('alsoBoughtInstance', this);
        this.products = [];
        this.requestDelay = 1000;

        this.retrieveAlsoBoughtProducts();

        this.onAddAllButtonClick = this.onAddAllButtonClick.bind(this);
        this.onAddToCartButtonClick = this.onAddToCartButtonClick.bind(this);
        this.onParentFormSubmit = this.onParentFormSubmit.bind(this);
        this.unbindEvents();
        this.bindEvents();
    }

    unbindEvents() {
        $('[data-add-all]', this.$alsoBoughtEl).off('click', this.onAddAllButtonClick);
        $('[data-add-to-cart]', this.$alsoBoughtEl).off('click', this.onAddToCartButtonClick);
        $('form[data-cart-item-add]', this.parentProductDetails.$scope).off('submit', this.onParentFormSubmit);
    }

    bindEvents() {
        $('[data-add-all]', this.$alsoBoughtEl).on('click', this.onAddAllButtonClick);
        $('[data-add-to-cart]', this.$alsoBoughtEl).on('click', this.onAddToCartButtonClick);
        $('form[data-cart-item-add]', this.parentProductDetails.$scope).on('submit', this.onParentFormSubmit);
    }

    retrieveAlsoBoughtProducts() {
        const $thumbnails = $('[data-thumbnails]', this.$alsoBoughtEl);
        const options = {
            template: {
                details: 'papa-supermarket/also-bought/product-details',
                thumbnail: 'papa-supermarket/also-bought/product-thumbnail',
            },
        };
        const $productEls = $('[data-product-id]', this.$alsoBoughtEl);

        if ($productEls.length > 0) {
            this.$alsoBoughtEl.removeClass('u-hiddenVisually');
        }

        $productEls.each((i, productEl) => {
            const $productEl = $(productEl);
            const productID = $productEl.data('productId');
            const $thumbEl = $('<div class="productView-alsoBought-thumbnail-item"></div>');
            $thumbnails.append($thumbEl);

            utils.api.product.getById(productID, options, (err, resp) => {
                $productEl.append(resp.details);
                $thumbEl.append(resp.thumbnail);

                if ($thumbEl.is(':empty')) {
                    $thumbEl.remove();
                }

                if ($productEl.is(':empty')) {
                    $productEl.remove();
                } else {
                    // init foundation collapsible
                    collapsibleFactory('[data-options-collapsible]', { $context: $productEl });

                    // bind events
                    $('[data-also-bought-checkbox]', $productEl).on('change', this.onAlsoBoughtCheckboxChange.bind(this, $productEl));

                    this.products.push(new ProductDetails($productEl, _.extend(this.parentProductDetails.context, { enableAlsoBought: false })));
                }

                // Hide Also Bought block if all products are not purchasable
                if (this.$alsoBoughtEl.find('[data-product-id]').length === 0) {
                    this.$alsoBoughtEl.addClass('u-hiddenVisually');
                }
            });
        });
    }

    onAddAllButtonClick(e) {
        e.preventDefault();

        $('[data-also-bought-checkbox]', this.$alsoBoughtEl)
            .prop('checked', true)
            .trigger('change');
    }

    onAddToCartButtonClick(e) {
        e.preventDefault();
        this.parentProductDetails.getViewModel(this.parentProductDetails.$scope).$addToCart.click();
    }

    onParentFormSubmit() {
        const $addToCart = $('[data-add-to-cart]', this.$alsoBoughtEl);
        const $mainAddToCart = this.parentProductDetails.getViewModel(this.parentProductDetails.$scope).$addToCart;
        const waitMessage = $mainAddToCart.data('waitMessage');

        $addToCart
            .data('originalValue', $addToCart.html())
            .html(waitMessage)
            .prop('disabled', true);
    }

    onAlsoBoughtCheckboxChange($productEl, e) {
        const $cb = $(e.target);
        const $toggle = $productEl.find('[data-options-collapsible]').first();
        const $label = $(`label[for="${$cb.attr('id')}"]`, this.$alsoBoughtEl);

        // open (close) product options form if checkbox is checked (unchecked)
        if ($cb.prop('checked')) {
            $label.addClass('is-checked');
            if (!$toggle.hasClass('is-open')) {
                $toggle.trigger('click');
            }
        } else {
            $label.removeClass('is-checked');
            if ($toggle.hasClass('is-open')) {
                $toggle.trigger('click');
            }
        }
    }

    /**
     * Promise to Call after the parent product is added to add also-bought products.
     */
    async parentProductAddedToCart() {
        // console.log('parent product added');

        const promises = [];
        let success = true;

        this.products.forEach(product => {
            if (product.$scope.find('[data-also-bought-checkbox]:checked').length > 0) {
                promises.push(async () => {
                    try {
                        await this.addProductToCart(product); // eslint-disable-line no-unused-expressions
                        await delay(this.requestDelay); // eslint-disable-line no-unused-expressions
                    } catch (e) {
                        success = false;
                    }
                });
            }
        });

        await promiseSerial(promises); // eslint-disable-line no-unused-expressions

        // Enable Add selected to cart button
        const $addToCart = $('[data-add-to-cart]', this.$alsoBoughtEl);
        $addToCart
            .html($addToCart.data('originalValue'))
            .prop('disabled', false);

        return success;
    }

    addProductToCart(product) {
        return new Promise((resolve, reject) => {
            const form = $('form[data-cart-item-add]', product.$scope).get(0);
            const $addToCartBtn = $('#form-action-addToCart', product.$scope);
            const originalBtnVal = $addToCartBtn.val();
            const waitMessage = $addToCartBtn.data('waitMessage');
            const $errorBox = $('[data-error-box]', product.$scope);
            const $errorMsg = $('[data-error-message]', product.$scope);
            const $checkbox = $('[data-also-bought-checkbox]', product.$scope);

            // Do not do AJAX if browser doesn't support FormData
            if (window.FormData === undefined) {
                resolve();
            }

            $addToCartBtn
                .val(waitMessage)
                .prop('disabled', true);

            product.$overlay.show();

            // Add item to cart
            utils.api.cart.itemAdd(product.filterEmptyFilesFromForm(new FormData(form)), (err, response) => {
                const errorMessage = err || response.data.error;

                // console.log(form);

                $addToCartBtn
                    .val(originalBtnVal)
                    .prop('disabled', false);

                product.$overlay.hide();

                // Guard statement
                if (errorMessage) {
                    // console.log('reject add product');

                    $errorMsg.html(errorMessage);
                    $errorBox.removeClass('u-hiddenVisually');
                    if ($errorBox.length > 0) {
                        scrollToElement($errorBox.get(0));
                    }

                    reject();
                    return;
                }

                // console.log('resolve add product');
                $errorMsg.empty();
                $errorBox.addClass('u-hiddenVisually');
                $checkbox.prop('checked', false).trigger('change');

                resolve();
            });
        });
    }
}
