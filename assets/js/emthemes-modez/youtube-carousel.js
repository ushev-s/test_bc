import mediaQueryListFactory from '../theme/common/media-query-list';

let mediumMediaQuery;
let uid = 1;

class YoutubeSlick {
    constructor(slick) {
        this.$slick = $(slick);
        this.$videos = this.$slick.find('[data-youtube]');
        this.onSlickInit = this.onSlickInit.bind(this);
        this.onSlickBeforeChange = this.onSlickBeforeChange.bind(this);
        this.onSlickAfterChange = this.onSlickAfterChange.bind(this);
        this.onPlayerReady = this.onPlayerReady.bind(this);
        this.onPlayerStateChange = this.onPlayerStateChange.bind(this);
        this.bindEvents();
    }

    bindEvents() {
        if (this.$slick.hasClass('slick-initialized')) {
            this.onSlickInit();
        }

        this.$slick.on('init', this.onSlickInit);
        this.$slick.on('beforeChange', this.onSlickBeforeChange);
        this.$slick.on('afterChange', this.onSlickAfterChange);
    }

    onPlayerReady(event) {
        // store player object for use later
        $(event.target.getIframe()).closest('.slick-slide').data('youtube-player', event.target);

        // On desktop: Play video if first slide is video
        if (mediumMediaQuery.matches) {
            setTimeout(() => {
                if ($(event.target.getIframe()).closest('.slick-slide').hasClass('slick-active')) {
                    if (this.$slick.is('[data-youtube-mute]')) {
                        event.target.mute();
                    }
                    if (this.$slick.is('[data-youtube-autoplay]')) {
                        this.$slick.slick('slickPause');
                        event.target.playVideo();
                    }
                }
            }, 200);
        }
    }

    onPlayerStateChange(event) {
        // Stop slick autoplay when video start playing
        if (event.data === YT.PlayerState.PLAYING) { // eslint-disable-line
            this.$slick.addClass('slick-video-playing');
            this.$slick.slick('slickPause');
        }

        if (event.data === YT.PlayerState.PAUSED) { // eslint-disable-line
            this.$slick.removeClass('slick-video-playing');
        }

        // go to next slide and enable autoplay back when video ended
        if (event.data === YT.PlayerState.ENDED) { // eslint-disable-line
            this.$slick.removeClass('slick-video-playing');
            this.$slick.slick('slickPlay');
            this.$slick.slick('slickNext');
        }
    }

    onSlickInit() {
        this.$videos.each((j, vid) => {
            const $vid = $(vid);
            const id = `youtube_player_${uid++}`;

            $vid.attr('id', id);

            // init player
            const player = new YT.Player(id, { // eslint-disable-line
                // host: 'http://www.youtube.com',
                videoId: $vid.data('youtube'),
                wmode: 'transparent',
                playerVars: {
                    controls: 0,
                    disablekb: 1,
                    enablejsapi: 1,
                    fs: 0,
                    rel: 0,
                    showinfo: 0,
                    iv_load_policy: 3,
                    modestbranding: 1,
                    wmode: 'transparent',
                },
                events: {
                    onReady: this.onPlayerReady,
                    onStateChange: this.onPlayerStateChange,
                },
            });
        });
    }

    onSlickBeforeChange() {
        const player = this.$slick.find('.slick-slide.slick-active').data('youtube-player');
        if (player) {
            player.stopVideo();
        }
    }

    onSlickAfterChange() {
        // Enable auto slide
        this.$slick.slick('slickPlay');

        // On desktop:
        // - Auto play video when open next slide
        // - Stop auto slide
        if (mediumMediaQuery.matches) {
            const player = this.$slick.find('.slick-slide.slick-active').data('youtube-player');
            if (player) {
                if (this.$slick.is('[data-youtube-mute]')) {
                    player.mute();
                }
                if (this.$slick.is('[data-youtube-autoplay]')) {
                    this.$slick.slick('slickPause');
                    player.playVideo();
                }
            }
        }
    }
}

function initCarousel($carousel) {
    $carousel.each((i, slick) => {
        const $slick = $(slick);
        if ($slick.find('[data-youtube]').length > 0) {
            $slick.addClass('slick-slider--video');
            new YoutubeSlick(slick); // eslint-disable-line
        }
    });
}

export default function youtubeCarouselFactory($carousel) {
    if ($carousel.find('[data-youtube]').length > 0) {
        mediumMediaQuery = mediaQueryListFactory('medium');

        if (typeof window.onYouTubeIframeAPIReady === 'undefined') {
            window.onYouTubeIframeAPIReady = initCarousel.bind(window, $carousel);

            // Load the IFrame Player API code asynchronously.
            const tag = document.createElement('script');
            tag.src = 'https://www.youtube.com/player_api';
            const firstScriptTag = document.getElementsByTagName('script')[0];
            firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

            // $('body').append('<script src="https://www.youtube.com/iframe_api"></script>');
        } else {
            initCarousel($carousel);
        }
    }
}
