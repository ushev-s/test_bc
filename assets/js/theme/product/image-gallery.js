// ============================================================================
// PAPATHEMES SARAHMARKET CUSTOMIZATION:
// - Using slick carousel for image thumbnails.
// - Using baguetteBox for image lightbox.
// ============================================================================

import $ from 'jquery';
import _ from 'lodash';
import 'slick-carousel';
// eslint-disable-next-line import/no-unresolved
import baguetteBox from 'baguettebox';

export default class ImageGallery {
    constructor($gallery) {
        this.$gallery = $gallery;
        this.$mainCarousel = $gallery.find('[data-image-gallery-main]');
        this.$navCarousel = $gallery.find('[data-image-gallery-nav]');
        this.$videoPlayer = $gallery.find('[data-video-player]');
        this.$videoPlayerIframe = this.$videoPlayer.find('iframe');

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

        this.baguetteBoxOptions = {
            onChange: (currentIndex) => {
                this.stopVideo();
                this.$videoPlayer.removeClass('_bb');
                this.$gallery.removeClass('_bb');

                const slick = this.$mainCarousel.slick('getSlick');
                const $a = $(slick.$slides[currentIndex]).find('[data-video-id]')
                    .clone(false)
                    .on('click', event => {
                        event.preventDefault();
                        this.$gallery.addClass('_bb');
                        this.$videoPlayer.addClass('_bb');
                        this.showVideo($(event.currentTarget).data('videoUrl'));
                    });
                if ($a.length > 0) {
                    const $figure = $('#baguetteBox-slider').children().eq(currentIndex).children('figure');
                    $figure.html('').append($a);
                }
            },
            afterHide: () => {
                this.stopVideo();
                this.$videoPlayer.removeClass('_bb');
                this.$gallery.removeClass('_bb');
            },
            removeVideoClickEvent: () => {
                this.$mainCarousel.find('[data-video-id]').each((i, el) => {
                    const $el = $(el);
                    const $clone = $el.clone(false);
                    $el.after($clone).remove();
                });
            },
        };
    }

    stopVideo() {
        this.$videoPlayerIframe.attr('src', '');
        this.$videoPlayer.addClass('hide');
    }

    showVideo(src) {
        this.$videoPlayer.removeClass('hide');
        this.$videoPlayerIframe.attr('src', src);
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

    swapMainImage({
        ignoreBaguetteBox = false,
    } = {}) {
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

        if (!ignoreBaguetteBox) {
            // empty lightbox contents of current galley so that it will be created again
            $('#baguetteBox-slider').html('');
            baguetteBox.run(`#${this.$mainCarousel.attr('id')}`, { ...this.baguetteBoxOptions }); // init again
            this.baguetteBoxOptions.removeVideoClickEvent();
        }
    }

    bindEvents() {
        this.fixLayoutShift();

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

                // Dont re-init BaquetteBox if not actually slide to next page
                const ignoreBaguetteBox = this.$navCarousel.find('.slick-current').length > 0 && currentSlide === nextSlide;
                this.swapMainImage({ ignoreBaguetteBox });

                this.savedImage = null;
            })
            .on('afterChange', () => {
                this.setActiveThumb();
                this.stopVideo();
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

        baguetteBox.run(`#${this.$mainCarousel.attr('id')}`, { ...this.baguetteBoxOptions });
        this.baguetteBoxOptions.removeVideoClickEvent();

        const onVideoClick = (event) => {
            event.preventDefault();
            this.showVideo($(event.currentTarget).data('videoUrl'));
        };
        this.$mainCarousel.on('click', '[data-video-id]', onVideoClick);
    }

    fixLayoutShift() {
        const mainCarouselInitHeight = this.$mainCarousel.height();
        this.$mainCarousel
            .one('init', () => {
                this.$mainCarousel.css('height', mainCarouselInitHeight);
            })
            .one('breakpoint destroy', () => {
                this.$navCarousel.css('height', '');
            });

        const navCarouselInitHeight = this.$navCarousel.height();
        this.$navCarousel
            .one('init', (event, slick) => {
                if (slick && slick.options && !slick.options.vertical) {
                    this.$navCarousel.css('height', navCarouselInitHeight);
                }
            })
            .one('breakpoint destroy', () => {
                this.$navCarousel.css('height', '');
            });

        $(window).one('resize', () => {
            this.$mainCarousel.css('height', '');
            this.$navCarousel.css('height', '');
        });
    }
}
