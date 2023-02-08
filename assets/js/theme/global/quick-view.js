import _ from 'lodash';
import 'foundation-sites/js/foundation/foundation';
import 'foundation-sites/js/foundation/foundation.dropdown';
import utils from '@bigcommerce/stencil-utils';
import ProductDetails from '../common/product-details';
import { defaultModal } from './modal';
import 'slick-carousel';
import { loadRemoteBanners } from '../../emthemes-modez/theme-utils'; // Supermarket

export default function (context) {
    // Supermarket - Instantload feature
    if (context.themeSettings.instantload) {
        return;
    }

    const modal = defaultModal();

    // papaSupermarket add .quickview-alt to support Choose Options show quickview
    $('body').on('click', '.quickview, .quickview-alt', event => {
        event.preventDefault();

        const productId = $(event.currentTarget).data('productId');

        modal.open({ size: 'large' });

        utils.api.product.getById(productId, { template: 'products/quick-view' }, (err, response) => {
            modal.updateContent(response);

            modal.$content.find('.productView').addClass('productView--quickView');

            modal.$content.find('[data-slick]').slick();

            // Supermarket Also Bought MOD {{{
            loadRemoteBanners(context, modal.$content);
            const $quickView = modal.$content.find('.quickView');
            let product;
            if ($('[data-also-bought] .productView-alsoBought-item', $quickView).length > 0) {
                product = new ProductDetails($quickView, _.extend(context, { enableAlsoBought: true }));
            } else {
                product = new ProductDetails($quickView, context);
            }

            $('body').trigger('loaded.quickview', [product]);

            return product;
            // }}}
        });
    });
}
