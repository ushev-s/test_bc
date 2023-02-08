// ============================================================================
// PAPATHEMES SARAHMARKET CUSTOMIZATION:
// - Using slick carousel for image thumbnails.
// - Using baguetteBox for image lightbox.
// ============================================================================

import $ from 'jquery';
import _ from 'lodash';
import 'slick-carousel';
import baguetteBox from 'baguettebox';

export default class ImageGallery {
    constructor($gallery) {
        this.$mainCarousel = $gallery.find('[data-image-gallery-main]');
        this.$navCarousel = $gallery.find('[data-image-gallery-nav]');

        const $defSlide = this.$mainCarousel.find('.slick-current');
        const defSlideIdx = $defSlide.parent().children().index($defSlide);

        this.currentSlideIndex = defSlideIdx;

        const uid = _.uniqueId('');

        if (this.$mainCarousel.attr('id') === '') {
            this.$mainCarousel.attr('id', `imageGalleryMainCarousel${uid}`);
        }

        if (this.$navCarousel.attr('id') === '') {
            this.$navCarousel.attr('id', `imageGalleryNavCarousel${uid}`);
        }
    }

    init() {
        this.bindEvents();
    }

    setMainImage(imgObj) {
        this.currentImage = _.clone(imgObj);

        this.swapMainImage();
    }

    setAlternateImage(imgObj) {
        if (!this.savedImage) {
            this.savedImage = _.clone(this.currentImage);
        }
        this.setMainImage(imgObj);
    }

    restoreImage() {
        if (this.savedImage) {
            this.setMainImage(this.savedImage);
            delete this.savedImage;
        }
    }

    setActiveThumb() {
        const i = this.$mainCarousel.slick('slickCurrentSlide');
        this.$navCarousel
            .find('.slick-slide')
            .removeClass('slick-current')
            .eq(i)
            .addClass('slick-current');
    }

    swapMainImage() {
        /*
        try {
            this.$mainCarousel.slick('slickGoTo', this.currentSlideIndex);
        } catch (e) {
            // ignore
        }
        */
        $('.slick-current', this.$navCarousel).removeClass('slick-current');
        this.$mainCarousel.find('.slick-slide').eq(this.currentSlideIndex).find('img').attr('src', this.currentImage.mainImageUrl);
        this.$mainCarousel.find('.slick-slide').eq(this.currentSlideIndex).find('img').attr('srcset', this.currentImage.mainImageSrcset);
        this.$mainCarousel.find('.slick-slide').eq(this.currentSlideIndex).find('a').attr('href', this.currentImage.zoomImageUrl);

        // empty lightbox contents of current galley so that it will be created again
        $('#baguetteBox-slider').html('');
        baguetteBox.run(`#${this.$mainCarousel.attr('id')}`); // init again
    }

    bindEvents() {
        this.$mainCarousel
            .on('init', () => {
                const $img = $(`[data-slick-index="${this.currentSlideIndex}"] img`, this.$mainCarousel);
                const $a = $img.closest('a');

                this.currentImage = {
                    mainImageUrl: $a.data('originalImg') || $img.attr('src'),
                    zoomImageUrl: $a.data('originalZoom'),
                    mainImageSrcset: $a.data('originalSrcset'),
                    $selectedThumb: null,
                };
            })
            .on('beforeChange', (event, slick, currentSlide, nextSlide) => {
                this.currentSlideIndex = nextSlide;

                const $img = $(`[data-slick-index="${nextSlide}"] img`, this.$mainCarousel);
                const $a = $img.closest('a');

                this.currentImage = {
                    mainImageUrl: $a.data('originalImg') || $img.attr('src'),
                    zoomImageUrl: $a.data('originalZoom'),
                    mainImageSrcset: $a.data('originalSrcset'),
                    $selectedThumb: null,
                };

                this.swapMainImage();

                this.savedImage = null;
            })
            .on('afterChange', () => {
                this.setActiveThumb();
            })
            .slick({
                slidesToShow: 1,
                slidesToScroll: 1,
                infinite: false,
                initialSlide: this.currentSlideIndex,
                asNavFor: this.$navCarousel.length > 0 ? `#${this.$navCarousel.attr('id')}` : null,
                swipe: false,
                arrows: false,
                responsive: [
                    {
                        breakpoint: 800,
                        settings: {
                            swipe: true,
                        },
                    },
                ],
            });

        // setTimeout(() => {
        this.$navCarousel.on('setPosition', () => {
            try {
                const slick = this.$navCarousel.slick('getSlick');
                if (slick.options.slidesToShow >= slick.slideCount) {
                    this.$navCarousel.find('.slick-track').css('transform', 'none');
                }
            } catch (e) {
                // ignore
            }
        });

        if (this.$navCarousel.data('imageGalleryNavHorizontal')) {
            this.$navCarousel
                .slick({
                    slidesToShow: parseInt(this.$navCarousel.data('image-gallery-nav-slides'), 10),
                    slidesToScroll: 1,
                    infinite: false,
                    initialSlide: this.currentSlideIndex,
                    asNavFor: `#${this.$mainCarousel.attr('id')}`,
                    arrows: true,
                    focusOnSelect: true,
                    centerPadding: 0,
                    adaptiveHeight: true,
                    // variableWidth: true,
                    lazyLoad: 'progressive',
                    responsive: [
                        {
                            breakpoint: 550,
                            settings: {
                                arrows: false,
                            },
                        },
                    ],
                });
        } else {
            this.$navCarousel
                .slick({
                    slidesToShow: parseInt(this.$navCarousel.data('image-gallery-nav-slides'), 10),
                    slidesToScroll: 1,
                    infinite: false,
                    initialSlide: this.currentSlideIndex,
                    asNavFor: `#${this.$mainCarousel.attr('id')}`,
                    arrows: true,
                    vertical: true,
                    verticalSwiping: true,
                    focusOnSelect: true,
                    centerPadding: 0,
                    adaptiveHeight: true,
                    lazyLoad: 'progressive',
                    responsive: [
                        {
                            breakpoint: 550,
                            settings: {
                                vertical: false,
                                verticalSwiping: false,
                                // slidesToShow: 1,
                                arrows: false,
                                // variableWidth: true,
                            },
                        },
                    ],
                });
        }
        // }, 200);

        baguetteBox.run(`#${this.$mainCarousel.attr('id')}`);
    }
}
