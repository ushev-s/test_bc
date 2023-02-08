import utils from '@bigcommerce/stencil-utils';
import collapsibleFactory from '../theme/common/collapsible';

let remoteBannerCache;

export function autoExpandCategoryMenu(context) {
    if (context.enableVerticalCurrentCategory) {
        let $curMenuItem;

        if (context.pageType === 'product') {
            const url = $('.breadcrumbs .breadcrumb.is-active').prev().find('a').attr('href');
            if (url) {
                $curMenuItem = $('#emthemesModez-verticalCategories-sidebar').find(`a.navPages-action[href='${url}']`);
            }
        } else {
            $curMenuItem = $('[data-current-category]');
        }

        if ($curMenuItem && $curMenuItem.length > 0) {
            const collapsibles = [];

            if ($curMenuItem.attr('data-collapsible')) {
                collapsibles.push($curMenuItem);
            }

            $curMenuItem.parents('.navPage-childList, .navPage-subMenu').prev('[data-collapsible]').each((i, el) => {
                collapsibles.push(el);
            });

            $.each(collapsibleFactory(collapsibles), (i, o) => {
                o.open();
            });

            // scrollToElement('[data-current-category]', { align: 'middle' });
        }
    }
}

export function bindNavPagesCheckRightEdge(mediaQuery) {
    $('.navPages-item').hover(event => {
        if (!mediaQuery || !mediaQuery.matches) {
            return;
        }

        const $hoverEl = $(event.currentTarget);

        $hoverEl.children('.navPage-subMenu').each((i, submenu) => {
            const $submenu = $(submenu);

            if ($submenu.offset().left + $submenu.width() > $(window).width()) {
                $submenu
                    .addClass('toLeft')
                    .css('left', `${$hoverEl.position().left + $hoverEl.width() - $submenu.width()}px`);
            }
        });
    }, event => {
        if (!mediaQuery || !mediaQuery.matches) {
            return;
        }

        const $hoverEl = $(event.currentTarget);

        $hoverEl.children('.navPage-subMenu').each((i, submenu) => {
            const $submenu = $(submenu);

            $submenu
                .removeClass('toLeft')
                .css('left', '');
        });
    });

    $('.navPage-subMenu-item, .navPage-childList-item').hover(event => {
        if (!mediaQuery || !mediaQuery.matches) {
            return;
        }

        const $hoverEl = $(event.currentTarget);

        $hoverEl.children('.navPage-childList').each((i, submenu) => {
            const $submenu = $(submenu);
            if ($submenu.offset().left + $submenu.width() > $(window).width()) {
                $submenu.addClass('toLeft');
            }
        });
    }, event => {
        if (!mediaQuery || !mediaQuery.matches) {
            return;
        }

        const $hoverEl = $(event.currentTarget);

        $hoverEl.children('.navPage-childList').each((i, submenu) => {
            const $submenu = $(submenu);

            $submenu.removeClass('toLeft');
        });
    });
}

export function checkTouchDevice() {
    const prefixes = ' -webkit- -moz- -o- -ms- '.split(' ');
    const mq = (query) => window.matchMedia(query).matches;

    if (('ontouchstart' in window) || window.DocumentTouch && document instanceof window.DocumentTouch) {
        return true;
    }

    // include the 'heartz' as a way to have a non matching MQ to help terminate the join
    // https://git.io/vznFH
    const query = ['(', prefixes.join('touch-enabled),('), 'heartz', ')'].join('');
    return mq(query);
}

/**
 * Ajax load remote banner
 * - Banner must has position 'top'
 * - Banner must assign to Search page
 */
export function loadRemoteBanners(context, $scope) {
    const $regions = $('[data-emthemesmodez-remote-banner]', $scope);

    if ($regions.length > 0) {
        const update = (resp) => {
            const $resp = $(resp);
            if ($resp.length > 0) {
                $regions.each((i, region) => {
                    const $region = $(region);
                    const regionName = $(region).data('emthemesmodezRemoteBanner');

                    if (regionName) {
                        $region.after($resp.find(`[id='${regionName}'], .${regionName}`).clone());
                    }
                });
            }
            $regions.remove();
        };

        if (remoteBannerCache) {
            update(remoteBannerCache.content);
        } else {
            utils.api.getPage(`${context.urls.search}?search_query=&section=content`, { template: 'papa-supermarket/banners/remote' }, (err, resp) => {
                if (err) {
                    return;
                }
                remoteBannerCache = { content: resp };
                update(remoteBannerCache.content);
            });
        }
    }
}

export default {
    autoExpandCategoryMenu,
    bindNavPagesCheckRightEdge,
    checkTouchDevice,
    loadRemoteBanners,
};
