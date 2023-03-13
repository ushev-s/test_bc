import _ from 'lodash';
import utils from '@bigcommerce/stencil-utils';
import { defaultModal } from '../theme/global/modal';
import ProductDetails from '../theme/common/product-details';
import 'slick-carousel';
import foundation from '../theme/global/foundation';
import collapsibleFactory from '../theme/common/collapsible';
import { checkTouchDevice, loadRemoteBanners } from './theme-utils';

const isTouchDevice = checkTouchDevice();
const history = window.history;
const Preloader = {
    cache: {},
    cacheLimit: 100,
    loading: {},

    /**
     * Wait until no other the same url loading
     * @param {String} cacheKey
     */
    async waitLoading(cacheKey) {
        if (!Preloader.loading[cacheKey]) {
            return;
        }
        // eslint-disable-next-line no-unused-expressions
        await new Promise(resolve => {
            const check = () => {
                if (!Preloader.loading[cacheKey]) {
                    resolve();
                } else {
                    _.delay(check, 300);
                }
            };
            check();
        });
    },

    /**
     * @param {Function} request Promise function
     * @param {String} cacheKey
     * @return {Promise}
     */
    async load(request, cacheKey) {
        // eslint-disable-next-line no-unused-expressions
        await this.waitLoading(cacheKey);

        if (Preloader.getCache(cacheKey)) {
            return Preloader.getCache(cacheKey);
        }

        Preloader.loading[cacheKey] = true;

        try {
            const response = await request();
            Preloader.saveCache(response, cacheKey);
            delete Preloader.loading[cacheKey];
            return response;
        } catch (e) {
            delete Preloader.loading[cacheKey];
            throw e;
        }
    },

    getCache(cacheKey) {
        if (cacheKey && Preloader.cache[cacheKey]) {
            return Preloader.cache[cacheKey];
        }
        return null;
    },

    saveCache(data, cacheKey) {
        if (cacheKey) {
            if (_.size(Preloader.cache) >= Preloader.cacheLimit) {
                for (const k in Preloader.cache) {
                    if (Preloader.cache.hasOwnProperty(k)) {
                        delete Preloader.cache[k];
                        break;
                    }
                }
            }
            Preloader.cache[cacheKey] = data;
        }
    },
};

class InstantQuickView {
    constructor(context) {
        this.context = context;
        this.modal = defaultModal();
        this.onMouseEnterOrClick = this.onMouseEnterOrClick.bind(this);
        this.unbindEvents();
        this.bindEvents();
    }

    /**
     * Load a product quickview content
     * @param {String} productId
     * @return {Promise}
     */
    loadProduct(productId) {
        const request = () => new Promise((resolve, reject) => {
            utils.api.product.getById(productId, { template: 'products/quick-view' }, (err, response) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(response);
                }
            });
        });
        return Preloader.load(request, `quick-view|${productId}`);
    }

    onMouseEnterOrClick(event) {
        event.preventDefault();
        const $el = $(event.currentTarget);

        if (event.type === 'click') {
            this.modal.open({ size: 'large' });
        }

        this.loadProduct($el.data('productId')).then((response) => {
            if (event.type === 'click') {
                this.modal.updateContent(response);
                this.modal.$content.find('.productView').addClass('productView--quickView');
                this.modal.$content.find('[data-slick]').slick();
                loadRemoteBanners(this.context, this.modal.$content);
                _.delay(() => {
                    const $quickView = this.modal.$content.find('.quickView');
                    let product;
                    if ($('[data-also-bought] .productView-alsoBought-item', $quickView).length > 0) {
                        product = new ProductDetails($quickView, _.extend(this.context, { enableAlsoBought: true }));
                    } else {
                        product = new ProductDetails($quickView, this.context);
                    }
                    $('body').trigger('loaded.quickview', [product]);
                    return product;
                }, 200);
                if (window.addthis && typeof window.addthis.toolbox === 'function') {
                    window.addthis.toolbox('.addthis_toolbox');
                }
            }
        });
    }

    bindEvents() {
        $('body').on('mouseenter click', '.quickview, .quickview-alt', this.onMouseEnterOrClick);
    }

    unbindEvents() {
        $('body').off('mouseenter click', '.quickview, .quickview-alt', this.onMouseEnterOrClick);
    }
}

class InstantLoad {
    constructor(context) {
        // Won't init on touch screen
        if (isTouchDevice) {
            return;
        }

        this.context = context;
        this.$head = $('head');
        this.$body = $('body');
        this.$pageBody = $('.body').first();

        this.onMouseEnterOrClick = this.onMouseEnterOrClick.bind(this);
        this.onLoadPageManually = this.onLoadPageManually.bind(this);
        this.onPopstate = this.onPopstate.bind(this);

        if (!history.state) {
            history.replaceState({ instantload: true, pageType: this.context.pageType }, document.title, window.location);
        }

        this.unbindEvents();
        this.bindEvents();
    }

    initGlobal($scope) {
        foundation($(document));
        collapsibleFactory('[data-collapsible]', { $context: $scope });
        $('[data-slick]', $scope).slick();
        if (window.addthis && typeof window.addthis.toolbox === 'function') {
            window.addthis.toolbox('.addthis_toolbox');
        }
    }

    redirect(url) {
        window.location = url;
    }

    isUnsupportedPage(response) {
        return response.trim() === 'UNSUPPORTED' || !$(response).first().is('#instantload-html-element');
    }

    loadPage(url, show, pushState, pageType) {
        if (show) {
            this.$pageBody.addClass('instantload-loading');
        }

        if (pushState) {
            try {
                history.pushState({ instantload: true, pageType: this.context.pageType }, null, url);
            } catch (e) {
                if (show) {
                    return this.redirect(url);
                }
                return;
            }
        }

        let config;
        if (pageType === 'home') {
            config = {
                carousel: this.context.themeSettings.homepage_show_carousel,
                products: {
                    new: {
                        limit: this.context.themeSettings.specialProductsTab_init_count,
                    },
                    featured: {
                        limit: this.context.themeSettings.specialProductsTab_init_count,
                    },
                    top_sellers: {
                        limit: this.context.themeSettings.specialProductsTab_init_count,
                    },
                },
                blog: {
                    recent_posts: {
                        limit: this.context.themeSettings.homepage_blog_posts_count,
                    },
                },
                customer: {
                    recently_viewed_products: {
                        limit: this.context.themeSettings.product_recently_viewed,
                    },
                },
                shop_by_brand: {
                    limit: this.context.themeSettings.max_shop_by_brand,
                },
                categories: true,
                cart: true,
            };
        } else {
            config = {
                product: {
                    videos: {
                        limit: this.context.themeSettings.productpage_videos_count,
                    },
                    reviews: {
                        limit: this.context.themeSettings.productpage_reviews_count,
                    },
                    related_products: {
                        limit: this.context.themeSettings.productpage_related_products_count,
                    },
                    similar_by_views: {
                        limit: this.context.themeSettings.productpage_similar_by_views_count,
                    },
                },
                category: {
                    shop_by_price: true,
                    products: {
                        limit: this.context.themeSettings.categorypage_products_per_page,
                    },
                },
                blog: {
                    posts: {
                        limit: 5,
                        pages: 3,
                        summary: 500,
                    },
                    recent_posts: {
                        limit: this.context.themeSettings.homepage_blog_posts_count,
                    },
                },
                products: {
                    new: {
                        limit: 5,
                    },
                },
                brands: {
                    limit: 100,
                },
                brand: {
                    products: {
                        limit: this.context.themeSettings.brandpage_products_per_page,
                    },
                },
                shop_by_brand: {
                    limit: 9,
                },
                customer: {
                    recently_viewed_products: {
                        limit: this.context.themeSettings.product_recently_viewed,
                    },
                },
                categories: true,
                cart: true,
            };
        }

        const request = () => new Promise((resolve, reject) => {
            utils.api.getPage(url, { config }, (err, response) => {
                if (err || !response) {
                    reject(err);
                } else {
                    resolve(response);
                }
            });
        });

        Preloader.load(request, `loadPage|${url}`).then((response) => {
            if (show) {
                if (this.isUnsupportedPage(response)) {
                    return this.redirect(url);
                }

                this.$body.trigger('beforeload.instantload', [response]);

                const $response = $(response);
                const $respBody = $response.find('#instantload-body-element');

                $('html, body').scrollTop(0);

                // Remove the previous appended <head>'s child tags
                this.$head.children().each((i, el) => {
                    const $elm = $(el);
                    if ($elm.is('[data-instantload-head-dynamic]')) {
                        $elm.remove();
                    }
                });

                // Remove title, meta[property] ...
                this.$head.children('title, meta[property], link[rel=amphtml], link[rel=canonical]').remove();


                // Append new <head>'s child tags
                $response.find('#instantload-head-element').children().each((i, el) => {
                    const $elm = $(el);
                    $elm.attr('data-instantload-head-dynamic', '');
                    this.$head.append($elm);
                });

                // Replace <body>'s classes
                this.$body.attr('class', $respBody.attr('class'));

                // Replace '.body' element
                const $pageBody = $response.find('#instantload-page-body');
                if ($pageBody.length > 0) {
                    this.$pageBody.empty().append($pageBody.children());
                    this.initGlobal(this.$pageBody);
                }

                // Replace top & bottom banners
                this.$body.find('[data-banner-location=top]').empty().append($response.find('#instantload-banners-top').children());
                this.$body.find('[data-banner-location=bottom]').empty().append($response.find('#instantload-banners-bottom').children());

                // Remove and append the new script #instantload-script
                this.$body.find('#instantload-script').remove();
                this.$body.append($response.find('#instantload-script'));

                // Remove and append new elements match [data-instantload-body-dynamic]
                // Useful for loading third-party scripts
                this.$body.children('[data-instantload-body-dynamic]').remove();
                this.$body.append($respBody.children('[data-instantload-body-dynamic]'));

                this.$pageBody.removeClass('instantload-loading').addClass('instantload-loaded');
                _.delay(() => this.$pageBody.removeClass('instantload-loaded'), 300);

                this.$body.trigger('loaded.instantload', [response]);
            }
        }).catch(() => {
            if (show) {
                return this.redirect(url);
            }
        });
    }

    onMouseEnterOrClick(event) {
        event.preventDefault();

        const $el = $(event.currentTarget);
        const data = $el.data('instantload');
        const url = (typeof data === 'object' ? data.url : null) || $el.data('instantloadUrl') || $el.prop('href');
        const pageType = typeof data === 'object' ? data.page : null;

        if (!url) {
            return;
        }

        this.loadPage(url, event.type === 'click', event.type === 'click', pageType);
    }

    onPopstate() {
        // console.log('onPopstate - state:', history.state);
        if (!history.state) {
            return;
        }
        // console.log(history);

        if (history.state.instantload) {
            this.loadPage(window.location, true, false, history.state.pageType);
        } else {
            // Unsupported pages instantly at this stage - reload it
            window.location.reload();
        }
    }

    onLoadPageManually(event, url, eventType = '', pageType = null) {
        this.loadPage(url, eventType === 'click', eventType === 'click', pageType);
    }

    bindEvents() {
        $('body, [data-menu]').on('mouseenter click', '[data-instantload], [data-instantload-url]', this.onMouseEnterOrClick);
        $('body').on('loadPage.instantload', this.onLoadPageManually);
        $(window).on('popstate', this.onPopstate);
    }

    unbindEvents() {
        $('body, [data-menu]').off('mouseenter click', '[data-instantload], [data-instantload-url]', this.onMouseEnterOrClick);
        $('body').off('loadPage.instantload', this.onLoadPageManually);
        $(window).off('popstate', this.onPopstate);
    }
}


export default function (context) {
    // eslint-disable-next-line no-new
    new InstantQuickView(context);

    // eslint-disable-next-line no-new
    new InstantLoad(context);
}
