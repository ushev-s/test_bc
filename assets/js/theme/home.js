/**
 * This file is added by Supermarket theme.
 */

import PageManager from '../page-manager';
import initProductsByCategories from '../emthemes-modez/products-by-category';
import initSpecialProductsTabs from '../emthemes-modez/special-products-tabs';
import youtubeCarouselFactory from '../emthemes-modez/youtube-carousel';

export default class Home extends PageManager {
    onReady() {
        this.initProductsByCategorySection();
        this.initSpecialProductsTabsSection();
        this.initMainCarouselSection();
        this.initBrandsCarouselSection();
    }

    initProductsByCategorySection() {
        if (this.context.hasProductsByCategorySortingTabs) {
            initProductsByCategories();
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
