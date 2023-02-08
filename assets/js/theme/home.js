/**
 * This file is added by Supermarket theme.
 */

import PageManager from '../page-manager';
import initProductsByCategories from '../emthemes-modez/products-by-category';
import initSpecialProductsTabs from '../emthemes-modez/special-products-tabs';
import Instafeed from '../../vendor/instafeed/instafeed.min';
import youtubeCarouselFactory from '../emthemes-modez/youtube-carousel';

export default class Home extends PageManager {
    onReady() {
        this.initProductsByCategorySection();
        this.initInstagramSection();
        this.initSpecialProductsTabsSection();
        this.initMainCarouselSection();
        this.initBrandsCarouselSection();
    }

    initProductsByCategorySection() {
        if (this.context.hasProductsByCategorySortingTabs) {
            initProductsByCategories();
        }
    }

    initInstagramSection() {
        if (this.context.hasInstagram) {
            const $carousel = $('#instafeed-carousel');
            if ($carousel.length) {
                $carousel.on('instafeedAfter', () => {
                    $carousel.slick($carousel.data('emthemesmodezInstafeedCarousel'));
                });

                const feed = new Instafeed({
                    target: 'instafeed-carousel',
                    get: 'user',
                    userId: this.context.themeSettings.instagram_userid,
                    accessToken: this.context.themeSettings.instagram_token,
                    resolution: 'standard_resolution',
                    template: '<div class="emthemesModez-instafeed-item"><a href="{{link}}" target="_blank" id="{{id}}"><img src="{{image}}" /></a></div>',
                    sortBy: 'most-recent',
                    limit: this.context.themeSettings.instagram_count,
                    links: false,
                    after: () => {
                        $carousel.trigger('instafeedAfter');
                    },
                });
                feed.run();
            }
        }
    }

    initSpecialProductsTabsSection() {
        // Refresh products carousel when tab is open
        if (this.context.hasSpecialProductsTabs) {
            initSpecialProductsTabs({ context: this.context });
        }
    }

    initMainCarouselSection() {
        if (this.context.hasMainCarousel) {
            youtubeCarouselFactory($('[data-slick]'));

            //
            // Update main slideshow min-height to equal the vertical categories menu
            //
            const $categoriesMenu = $('body.papaSupermarket-layout--default .emthemesModez-verticalCategories--open');

            const updateMainSlideshowHeight = () => {
                $('.heroCarousel-slide').css('min-height', $(window).width() > 768 ? `${$categoriesMenu.height() + 20}px` : '');
            };

            if ($categoriesMenu.length > 0) {
                updateMainSlideshowHeight();
                $(window).on('resize', () => updateMainSlideshowHeight());
            }
        }
    }

    initBrandsCarouselSection() {
        $('[data-emthemesmodez-brand-carousel]').slick({
            dots: false,
            infinite: false,
            mobileFirst: true,
            slidesToShow: 2,
            slidesToScroll: 2,
            responsive: [
                {
                    breakpoint: 1260,
                    settings: {
                        slidesToScroll: 2,
                        slidesToShow: 5,
                    },
                },
                {
                    breakpoint: 800,
                    settings: {
                        slidesToScroll: 2,
                        slidesToShow: 5,
                    },
                },
                {
                    breakpoint: 550,
                    settings: {
                        slidesToScroll: 2,
                        slidesToShow: 3,
                    },
                },
            ],
        });
    }
}
