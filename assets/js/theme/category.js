import { hooks } from '@bigcommerce/stencil-utils';
import CatalogPage from './catalog';
// Supermarket Mod
// import compareProducts from './global/compare-products';
import compareProducts from '../emthemes-modez/compare-products';
import FacetedSearch from './common/faceted-search';
import actionBarFactory from '../emthemes-modez/action-bar'; // Papathemes - Supermarket
import { autoExpandCategoryMenu } from '../emthemes-modez/theme-utils'; // Supermarket
import bulkOrderFactory from '../emthemes-modez/bulk-order';
import SearchInCategory from '../emthemes-modez/search-in-category';

export default class Category extends CatalogPage {
    onReady() {
        // console.log('category onReady');
        autoExpandCategoryMenu(this.context); // Supermarket

        // Papathemes - Bulk Order
        if (this.context && (this.context.themeSettings.show_bulk_order_mode || this.context.useBulkOrder)) {
            this.bulkOrder = bulkOrderFactory(this.context);
        }

        // Supermarket Mod
        // compareProducts(this.context.urls);
        compareProducts(this.context);

        if ($('#facetedSearch').length > 0) {
            this.initFacetedSearch();
        } else {
            this.onSortBySubmit = this.onSortBySubmit.bind(this);
            hooks.on('sortBy-submitted', this.onSortBySubmit);
        }

        // Papathemes - Supermarket
        actionBarFactory();

        // Supermarket
        if (this.context.themeSettings.categorypage_search === 'show') {
            this.initSearchInCategory();
        }
    }

    // Supermarket
    destroy() {
        if (this.searchInCategory) {
            this.searchInCategory.destroy();
        }
        if (this.facetedSearch) {
            this.facetedSearch.destroy();
        } else {
            hooks.off('sortBy-submitted', this.onSortBySubmit);
        }
    }

    // Supermarket
    initSearchInCategory() {
        this.searchInCategory = new SearchInCategory({
            context: this.context,
            facetedSearch: this.facetedSearch,
            searchCallback: (content) => {
                $('#product-listing-container').html(content.productListing);

                if (this.bulkOrder) {
                    this.bulkOrder.reinit();
                }

                actionBarFactory();

                $('body').triggerHandler('compareReset');

                $('html, body').animate({
                    scrollTop: 0,
                }, 100);
            },
        });
    }

    initFacetedSearch() {
        const $productListingContainer = $('#product-listing-container');
        const $facetedSearchContainer = $('#faceted-search-container');
        const productsPerPage = this.context.categoryProductsPerPage;
        const requestOptions = {
            config: {
                category: {
                    shop_by_price: true,
                    products: {
                        limit: productsPerPage,
                    },
                },
            },
            template: {
                productListing: 'category/product-listing',
                sidebar: 'category/sidebar',
            },
            showMore: 'category/show-more',
        };

        this.facetedSearch = new FacetedSearch(requestOptions, (content) => {
            $productListingContainer.html(content.productListing);
            $facetedSearchContainer.html(content.sidebar);

            // Papathemes - Bulk Order
            if (this.bulkOrder) {
                this.bulkOrder.reinit();
            }

            $('body').triggerHandler('compareReset');

            $('html, body').animate({
                scrollTop: 0,
            }, 100);
        });
    }
}
