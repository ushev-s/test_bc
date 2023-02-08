import utils from '@bigcommerce/stencil-utils';
import { throttle } from 'lodash';

class SpecialProductsTabs {
    constructor($scope, context) {
        this.$scope = $scope;
        this.context = context;
        this.$viewportCheck = $scope.find('[data-viewport-check]');
        this.$loading = $scope.find('.loading').hide();
        this.$loadMore = $scope.find('.loadMore').hide();
        this.$collapse = $scope.find('.collapse').hide();
        this.defaultProductsCount = this.context.themeSettings.specialProductsTab_lazy_count + this.context.themeSettings.specialProductsTab_init_count;

        this.onCheckViewport = throttle(this.onCheckViewport.bind(this), 100);
        this.onLoadMore = this.onLoadMore.bind(this);
        this.onCollapse = this.onCollapse.bind(this);
        this.onTabToggled = this.onTabToggled.bind(this);

        if (this.context.themeSettings.specialProductsTab_more) {
            this.$loadMore.show();
        }

        this.bindEvents();
    }

    bindEvents() {
        $('body').one('beforeload.instantload', () => this.unbindEvents());

        if (this.$viewportCheck.length > 0) {
            $(window).on('load resize scroll', this.onCheckViewport);
        }

        if (this.context.themeSettings.specialProductsTab_more) {
            this.$loadMore.on('click', this.onLoadMore);
        }

        this.$collapse.on('click', this.onCollapse);

        $('[data-tab]', this.$scope).on('toggled', this.onTabToggled);
    }

    unbindEvents() {
        $(window).off('load resize scroll', this.onCheckViewport);
        this.$loadMore.off('click', this.onLoadMore);
        this.$collapse.off('click', this.onCollapse);
        $('[data-tab]', this.$scope).off('toggled', this.onTabToggled);
    }

    onCheckViewport() {
        const offset = 250;

        this.$viewportCheck.each((i, el) => {
            const $el = $(el);

            if (!$el.is(':visible')) {
                return;
            }

            const elTop = $el.offset().top;
            const elBottom = elTop + $el.outerHeight();
            const winTop = $(window).scrollTop();
            const winBottom = winTop + $(window).innerHeight();

            if (elTop - offset < winBottom && elBottom + offset > winTop) {
                this.loadViewportProducts(
                    $el.data('viewportCheck'),
                    $el.closest('.tab-content').find('.productGrid, .productList, .productCarousel'),
                );

                this.$viewportCheck = this.$viewportCheck.not($el);
                $el.remove();
            }
        });
    }

    onLoadMore(event) {
        event.preventDefault();

        const $tab = this.$scope.find('.tab-content.is-active');

        if (!$tab.data('loadedMore')) {
            $tab.data('loadedMore', true);

            const template = 'papa-supermarket/special-products-tabs/products';
            const limit = 100;
            const config = { products: {} };
            const type = $tab.data('productType');

            switch (type) {
            case 'featured':
                config.products.featured = { limit };
                break;
            case 'top':
                config.products.top_sellers = { limit };
                break;
            case 'new':
            default:
                config.products.new = { limit };
                break;
            }

            this.$loading.show();
            this.$loadMore.attr('disabled', true);

            utils.api.getPage(this.context.urls.search, { template, config }, (err, resp) => {
                this.$loading.hide();
                this.$loadMore.removeAttr('disabled');

                if (err || !resp) {
                    return;
                }

                const existProductIds = $tab
                    .find('.product, .productCarousel-slide')
                    .map((i, el) => $(el).data('productId')).get();

                const $products = $(resp)
                    .find('.product, .productCarousel-slide')
                    .filter((i, el) => existProductIds.indexOf($(el).data('productId')) === -1);

                $products
                    .slice(this.defaultProductsCount)
                    .hide();

                $tab
                    .find('.productGrid, .productList, .productCarousel')
                    .append($products);

                if (!$products.is(':hidden')) {
                    this.$loadMore.hide();
                }

                if ($products.length > 0) {
                    this.$collapse.show();
                }
            });
        } else {
            const $products = $tab.find('.product, .productCarousel-slide').filter(':hidden');

            $products
                .slice(0, this.defaultProductsCount)
                .show();

            if (!$products.is(':hidden')) {
                this.$loadMore.hide();
            }

            this.$collapse.show();
        }
    }

    onCollapse(event) {
        event.preventDefault();

        const $tab = this.$scope.find('.tab-content.is-active');
        const $products = $tab.find('.product, .productCarousel-slide');

        $products.slice(this.defaultProductsCount).hide();

        this.$collapse.hide();

        if ($products.length > this.defaultProductsCount) {
            this.$loadMore.show();
        }

        $('html, body').animate({
            scrollTop: $tab.offset().top,
        });
    }

    onTabToggled(event, tab) {
        const $tabContent = $($('a', tab).attr('href'));

        $('[data-slick]', $tabContent).slick('setPosition');

        if (this.$viewportCheck.length > 0) {
            this.onCheckViewport();
        }

        const $products = $tabContent.find('.product, .productCarousel-slide');
        const visible = $products.filter(':visible').length;

        if (!$tabContent.data('loadedMore') || $products.is(':hidden')) {
            this.$loadMore.show();
        } else {
            this.$loadMore.hide();
        }

        if (visible > this.defaultProductsCount) {
            this.$collapse.show();
        } else {
            this.$collapse.hide();
        }
    }

    loadViewportProducts(type, $container) {
        const template = 'papa-supermarket/special-products-tabs/products';
        const limit = this.defaultProductsCount;
        const config = { products: {} };

        switch (type) {
        case 'featured':
            config.products.featured = { limit };
            break;
        case 'top':
            config.products.top_sellers = { limit };
            break;
        case 'new':
        default:
            config.products.new = { limit };
            break;
        }

        this.$loading.show();

        utils.api.getPage(this.context.urls.search, { template, config }, (err, resp) => {
            this.$loading.hide();

            if (err || !resp) {
                return;
            }

            const $products = $(resp).find('.product, .productCarousel-slide');
            $container.empty().append($products);
        });
    }
}

export default function init({ selector = '[data-special-products-tabs]', context }) {
    $(selector).each((i, el) => {
        const $el = $(el);
        if (!$el.data('specialProductsTabsInstance')) {
            $el.data('specialProductsTabsInstance', new SpecialProductsTabs($el, context));
        }
    });
}
