import { throttle } from 'lodash';
import utils from '@bigcommerce/stencil-utils';
import foundation from '../theme/global/foundation';

class ProductsByCategory {
    constructor({
        id,
        index = 0,
        sort = '',
        limit = '',
        $parent,
    }) {
        this.onLoadMore = this.onLoadMore.bind(this);
        this.onCollapse = this.onCollapse.bind(this);

        this.id = id;
        this.index = index;
        this.sort = sort;
        this.limit = limit;
        this.$parent = $parent;
        this.$scope = $('<div class="emthemesModez-productsByCategoryTabs-loading"></div>');
        this.$loadMore = $();
        this.$collapse = $();
        this.$loader = $();

        this.$parent.append(this.$scope);

        this.request();
    }

    request() {
        const limitQuery = this.limit ? `&limit=${this.limit}` : '';
        const sortQuery = this.sort ? `&sort=${this.sort}` : '';
        const template = 'papa-supermarket/products-by-category-sorting-tabs/section';

        utils.api.getPage(`/categories.php?category=${this.id}${limitQuery}${sortQuery}`, { template }, (err, resp) => {
            if (err || !resp || resp.error) {
                this.$scope.remove();
                return;
            }

            const $resp = $(resp);
            this.$scope.replaceWith($resp);
            this.$scope = $resp;
            this.$loader = this.$scope.find('.loader');

            this.initTabs();
            this.initSlick();
            this.initBanner();
            this.initButtons();
        });
    }

    loadProducts({
        sort = '',
        page = '',
        $content,
    }) {
        const limitQuery = this.limit ? `&limit=${this.limit}` : '';
        const sortQuery = sort ? `&sort=${sort}` : '';
        const pageQuery = page ? `&page=${page}` : '';
        const template = 'papa-supermarket/products-by-category-sorting-tabs/products';

        this.$loader.addClass('loading');

        utils.api.getPage(`/categories.php?category=${this.id}${limitQuery}${sortQuery}${pageQuery}`, { template }, (err, resp) => {
            this.$loader.removeClass('loading');

            if (err || !resp) {
                return;
            }

            const $resp = $(resp);
            const $currentPage = $content.find('[data-current-page]');

            if ($currentPage.length > 0) {
                $currentPage.data({
                    currentPage: $resp.data('currentPage'),
                    hasNextPage: Boolean($resp.data('hasNextPage')),
                });
                $currentPage.find('.productGrid').append($resp.find('.productGrid').children());
            } else {
                $content
                    .html(resp)
                    .data('loaded', true);
            }

            this.initSlick();

            if ($resp.data('hasNextPage')) {
                this.$loadMore.show();
            } else {
                this.$loadMore.hide();
            }

            if ($resp.data('currentPage') > 1) {
                this.$collapse.show();
            } else {
                this.$collapse.hide();
            }
        });
    }

    initTabs() {
        foundation(this.$scope);

        this.$scope.find('.tab-content.is-active').data('loaded', true);

        $('[data-tab]', this.$scope).on('toggled', (event, tab) => {
            const $content = $($(tab).find('a').attr('href'));

            if ($content.data('loaded')) {
                const $currentPage = $content.find('[data-current-page]');

                if ($currentPage.data('hasNextPage')) {
                    this.$loadMore.show();
                } else {
                    this.$loadMore.hide();
                }

                if (Number($currentPage.data('currentPage')) > 1) {
                    this.$collapse.show();
                } else {
                    this.$collapse.hide();
                }

                return;
            }

            this.$loadMore.hide();
            this.$collapse.hide();

            this.loadProducts({
                sort: $content.data('sort'),
                $content,
            });
        });
    }

    initSlick() {
        // init products carousel
        $('[data-slick]', this.$scope)
            .on('init', e => setTimeout(() => {
                // init nested carousel
                $('[data-slick-nested]', e.target).each((i, el) => {
                    $(el).slick($(el).data('slickNested'));
                });
            }, 200))
            .on('breakpoint', e => setTimeout(() => {
                $('[data-slick-nested]', e.target).slick('setPosition');
            }, 200))
            .slick();
    }

    initBanner() {
        const $img = this.$scope.find('[data-banner] img');
        const src = `/product_images/uploaded_images/products-by-category-${this.index + 1}.jpg?c=2`;

        if ($img.hasClass('lazyload')) {
            $img.attr('data-src', src);
        } else {
            $img.attr('src', src);
        }
    }

    initButtons() {
        this.$loadMore = this.$scope.find('.loadMore').hide();
        this.$collapse = this.$scope.find('.collapse').hide();

        if (this.$scope.find('.tab-content.is-active [data-current-page]').data('hasNextPage')) {
            this.$loadMore.show();
        }

        this.$loadMore.on('click', this.onLoadMore);
        this.$collapse.on('click', this.onCollapse);
    }

    onLoadMore(event) {
        event.preventDefault();

        const $content = this.$scope.find('.tab-content.is-active');
        const $currentPage = $content.find('[data-current-page]');
        const $hide = $content.find('.product.hide');

        if ($hide.length > 0) {
            $hide.show().removeClass('hide');
            this.$collapse.show();

            if (!$currentPage.data('hasNextPage')) {
                this.$loadMore.hide();
            }
            return;
        }

        if ($currentPage.data('hasNextPage')) {
            const sort = $content.data('sort');
            const page = Number($currentPage.data('currentPage')) + 1;
            this.loadProducts({
                sort,
                page,
                $content,
            });
        } else {
            this.$loadMore.hide();
        }
    }

    onCollapse(event) {
        event.preventDefault();

        if (this.limit) {
            const $tab = this.$scope.find('.tab-content.is-active');
            const $hide = $tab.find('.product').slice(this.limit).hide().addClass('hide');

            if ($hide.length > 0) {
                this.$loadMore.show();
            }

            $('html, body').animate({
                scrollTop: $tab.offset().top,
            }, 500);
        }

        this.$collapse.hide();
    }
}

class ProductsByCategories {
    constructor($scope) {
        this.$scope = $scope;
        this.lazy = this.$scope.is('[data-lazy]');
        this.loaded = false;

        this.onCheckViewport = throttle(this.onCheckViewport.bind(this), 100);

        this.bindEvents();

        if (!this.lazy) {
            this.load();
        }
    }

    load() {
        this.loaded = true;

        const sort = this.$scope.data('sort');
        const limit = this.$scope.data('limit');

        String(this.$scope.data('pbcstGroup')).split(',').map((idStr, index) => new ProductsByCategory({
            id: idStr.trim(),
            index,
            sort,
            limit,
            $parent: this.$scope,
        }));
    }

    bindEvents() {
        $('body').one('beforeload.instantload', () => this.unbindEvents());

        if (this.lazy) {
            $(window).on('load resize scroll', this.onCheckViewport);
        }
    }

    unbindEvents() {
        $(window).off('load resize scroll', this.onCheckViewport);
    }

    onCheckViewport() {
        if (this.loaded) {
            $(window).off('load resize scroll', this.onCheckViewport);
            return;
        }

        if (!this.$scope.is(':visible')) {
            return;
        }

        const offset = 300;
        const elTop = this.$scope.offset().top;
        const elBottom = elTop + this.$scope.outerHeight();
        const winTop = $(window).scrollTop();
        const winBottom = winTop + $(window).innerHeight();

        if (elTop - offset < winBottom && elBottom + offset > winTop) {
            this.load();
        }
    }
}

export default function init(selector = '[data-pbcst-group]') {
    $(selector).each((i, el) => new ProductsByCategories($(el)));
}
