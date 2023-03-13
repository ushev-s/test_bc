import $ from 'jquery';
import _ from 'lodash';
import utils from '@bigcommerce/stencil-utils';
import ajaxAddToCart from './ajax-addtocart';
import collapsibleFactory from '../theme/common/collapsible';
import { bindNavPagesCheckRightEdge, loadRemoteBanners } from './theme-utils';
// import scrollTo from 'jquery.scrollto';
import scrollToElement from 'scroll-to-element';
import mediaQueryListFactory from '../theme/common/media-query-list';
import newsletterPopup from './newsletter-popup';
import cartPopupRemove from './cart-popup-remove';
import recentlyViewedProducts from './recently-viewed-products';

export default function (context) {
    const mq = mediaQueryListFactory('medium');

    ajaxAddToCart(context);

    // ========================================================================
    // Ajax load remote banner
    // ========================================================================
    loadRemoteBanners(context);
    $('body').on('loaded.instantload', () => loadRemoteBanners(context));

    // ------------------------------------------------------------------------
    // Fit Navigation
    // ------------------------------------------------------------------------
    if (context.themeSettings.navPages_autoFit) {
        import('./fit-nav').then(module => module.default(context));
    }

    // ------------------------------------------------------------------------
    // Sticky header
    // ------------------------------------------------------------------------

    const $stickyMenus = $('[data-stickymenu]');
    if ($stickyMenus.length > 0) {
        $stickyMenus.each((i, el) => {
            $(el).data('papathemesOriginalTop', $(el).offset().top)
                .after('<div class="papathemes-stickymenu-placeholder"></div>')
                .next().height($(el).outerHeight());
        });

        $(window)
            .on('scroll', _.debounce(() => {
                if (!mq || !mq.matches) {
                    $stickyMenus.removeClass('is-sticky');
                    return;
                }

                $stickyMenus.each((i, el) => {
                    if ($(window).scrollTop() > $(el).data('papathemesOriginalTop')) {
                        $(el).addClass('is-sticky');
                    } else {
                        $(el).removeClass('is-sticky');
                    }
                });
            }, 10))

            .on('resize', _.debounce(() => {
                $stickyMenus.each((i, el) => {
                    $(el).removeClass('is-sticky');

                    $(el).data('papathemesOriginalTop', $(el).offset().top);
                });
            }, 100));
    }

    // ------------------------------------------------------------------------
    // Support collapsible contents on product page on mobile
    // ------------------------------------------------------------------------

    $('body').on('click', '[data-emthemesmodez-mobile-collapse-handle]', event => {
        event.preventDefault();
        const $el = $(event.currentTarget);
        const $content = $el.parents('[data-emthemesmodez-mobile-collapse]').find('[data-emthemesmodez-mobile-collapse-content]');

        if ($content.length) {
            $el.toggleClass('is-active');
            $content.toggleClass('is-active');
        }

        if (!$el.hasClass('is-active')) {
            $el[0].scrollIntoView();
        }
    });

    const checkMobileCollapse = _.debounce(() => {
        if (mq.matches) {
            return;
        }

        $('[data-emthemesmodez-mobile-collapse-content]').each((i, el) => {
            const $content = $(el);

            if ($content.hasClass('is-active')) {
                return;
            }

            $content.css('max-height', '');

            const $height = $content.height();
            const $handle = $content.closest('[data-emthemesmodez-mobile-collapse]').find('[data-emthemesmodez-mobile-collapse-handle]');

            if ($content.css('max-height', 'none').height() <= $height) {
                $handle.hide();
            } else {
                $content.css('max-height', '');
                $handle.show();
            }
        });
    }, 200);

    $(window).on('load resize', checkMobileCollapse);
    $('body').on('loaded.instantload', checkMobileCollapse);

    // ------------------------------------------------------------------------
    // Enable data-collapsible globally
    // ------------------------------------------------------------------------

    collapsibleFactory();

    // ------------------------------------------------------------------------
    // Fix stencil-utils SortByHook calls native form.submit() when '[data-sort-by] select' changed
    // ------------------------------------------------------------------------

    utils.hooks.on('sortBy-select-changed', (event, target) => {
        if (!event.isDefaultPrevented) {
            $(target).closest('form').each((i, form) => {
                utils.hooks.emit('sortBy-submitted', event, form);
            });
        }
    });

    // ------------------------------------------------------------------------
    // Make page sidebar sticky
    // ------------------------------------------------------------------------
    const $pageSidebarSticky = $('[data-sidebar-sticky]');
    if ($pageSidebarSticky.length > 0) {
        $pageSidebarSticky.css('top', 0);
        let lastScrollTop = 0;
        $(window).on('scroll', _.debounce(() => {
            if (!mq.matches) {
                return;
            }

            const st = $(window).scrollTop();
            const wh = $(window).height();

            if (st > lastScrollTop) {
                // scroll down
                $pageSidebarSticky.each((i, el) => {
                    const $el = $(el);
                    let t = $el.offset().top;
                    const h = $el.height();

                    if (st >= t) {
                        t = Math.min(-Math.min(st - lastScrollTop - parseInt($el.css('top'), 10), h - wh), 0);
                        // console.log($el, t);
                        $el.css('top', `${t}px`);
                    }
                });
            } else {
                // scroll up
                $pageSidebarSticky.each((i, el) => {
                    const $el = $(el);

                    const t = parseInt($el.css('top'), 10);
                    if (t !== 0) {
                        $el.css('top', `${Math.min(t + lastScrollTop - st, 0)}px`);
                    }
                });
            }

            lastScrollTop = st;
        }, 10));
    }

    // ------------------------------------------------------------------------
    // Instant Load Pages
    // ------------------------------------------------------------------------
    if (context.themeSettings.instantload) {
        import('./instant-load.js').then(module => {
            module.default(context);
        });
    }

    // ------------------------------------------------------------------------
    // Scroll to Top button
    // ------------------------------------------------------------------------
    const $scrollToTopFloatingButton = $('#scrollToTopFloatingButton');
    let scrollToTopFloatingButtonShowing = false;

    if ($scrollToTopFloatingButton.length > 0) {
        $scrollToTopFloatingButton.on('click', () => {
            scrollToElement($scrollToTopFloatingButton.attr('href'), {
                duration: 300,
            });
        });

        $(window).on('scroll', _.debounce(() => {
            if (!mq || !mq.matches) {
                if (scrollToTopFloatingButtonShowing) {
                    $scrollToTopFloatingButton.addClass('u-hiddenVisually');
                    scrollToTopFloatingButtonShowing = false;
                }
                return;
            }

            if (!scrollToTopFloatingButtonShowing && $(window).scrollTop() > 500) {
                $scrollToTopFloatingButton.removeClass('u-hiddenVisually');
                scrollToTopFloatingButtonShowing = true;
            } else if (scrollToTopFloatingButtonShowing && $(window).scrollTop() <= 500) {
                $scrollToTopFloatingButton.addClass('u-hiddenVisually');
                scrollToTopFloatingButtonShowing = false;
            }
        }, 500));
    }

    // ------------------------------------------------------------------------
    // Main Menu UI improvement
    // ------------------------------------------------------------------------
    if (context.themeSettings.navPages_animation !== '' && context.themeSettings.navPages_animation !== 'no') {
        bindNavPagesCheckRightEdge(mq);
    }

    // ------------------------------------------------------------------------
    // Init Newsletter Popup
    // ------------------------------------------------------------------------
    if ($('#newsletterPopupModal').length > 0) {
        newsletterPopup(context);
    }

    // ------------------------------------------------------------------------
    // Init Cart Popup remove item button
    // ------------------------------------------------------------------------
    cartPopupRemove();

    // ------------------------------------------------------------------------
    // Init Recently Viewed Products
    // ------------------------------------------------------------------------
    recentlyViewedProducts(context);
}
