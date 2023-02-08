import 'slick-carousel';

export default function () {
    const $carousel = $('[data-slick]');

    if ($carousel.length) {
        $carousel.slick();
    }

    // Supermarket theme MOD: doesn't need below script
    // // Alternative image styling for IE, which doesn't support objectfit
    // if (typeof document.documentElement.style.objectFit === 'undefined') {
    //     $('.heroCarousel-slide').each((index, element) => {
    //         const $container = $(element);
    //         const imgUrl = $container.find('img').data('lazy');

    //         if (imgUrl) {
    //             $container.css('backgroundImage', `url(${imgUrl})`).addClass('compat-object-fit');
    //         }
    //     });
    // }
}
