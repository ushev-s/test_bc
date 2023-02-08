import utils from '@bigcommerce/stencil-utils';
import { uniq } from 'lodash';
import { currencyFormat } from './theme-utils';
import Mustache from 'mustache';

let instance;

const dummyStorage = {
    getItem: () => {},
    setItem: () => {},
    removeItem: () => {},
    clear: () => {},
};
const cache = {};

class RecentlyViewedProducts {
    constructor({
        customerRecentlyViewedProductIds = [],
        graphQLToken = '',
        currencyCode = 'USD',
        customerId = 0,
        restrictToLogin = false,
        template = `
            <h3 class="_heading">{{heading}}</h3>
            <ul class="_productList">
                {{#products}}
                    <li class="_productList-item">
                        <article class="card"
                            data-event-type="list"
                            data-entity-id="{{id}}"
                            data-position="{{index}}"
                            data-name="{{name}}"
                            data-product-price="{{price.value}}">
                            <figure class="card-figure">
                                <div class="card-img-container">
                                    <img
                                        src="{{defaultImage.url320wide}}"
                                        srcset="{{defaultImage.url80wide}} 80w, {{defaultImage.url160wide}} 160w, {{defaultImage.url320wide}} 320w, {{defaultImage.url640wide}} 640w"
                                        data-sizes="auto"
                                        class="card-image lazyload"
                                        alt="{{name}}"
                                        title="{{name}}">
                                </div>
                            </figure>
                            <div class="card-body">
                                <h4 class="card-title">
                                    <a href="{{url}}" data-event-type="product-click">{{name}}</a>
                                </h4>
                                {{#brand}}
                                    <p class="card-text--brand">{{brand}}</p>
                                {{/brand}}
                                {{#price}}
                                    <div class="card-text--price">
                                        {{&price.formatted}}
                                    </div>
                                {{/price}}
                            </div>
                        </article>
                    </li>
                {{/products}}
            </ul>
        `,
    } = {}) {
        this.onProductViewed = this.onProductViewed.bind(this);
        this.onDropdownOpened = this.onDropdownOpened.bind(this);

        this.storage = window.localStorage || dummyStorage;
        this.productIds = JSON.parse(this.storage.getItem('supermarket_recentlyViewedProducts') || '[]');
        this.customerRecentlyViewedProductIds = customerRecentlyViewedProductIds;
        this.graphQLToken = graphQLToken;
        this.currencyCode = currencyCode;
        this.customerId = customerId;
        this.restrictToLogin = restrictToLogin;
        this.template = template;
        this.dropdownHandler = $('[data-dropdown="recently-viewed-dropdown"]');

        const lastCustomerId = JSON.parse(this.storage.getItem('supermarket_customerId') || '0');

        // Clear recently viewed products of other customer last logged in
        if (lastCustomerId && lastCustomerId !== this.customerId) {
            this.productIds = [];
            this.storage.setItem('supermarket_recentlyViewedProducts', JSON.stringify(this.productIds));
            this.dropdownHandler.hide();
        }

        if (this.customerId || this.productIds.length > 0) {
            this.dropdownHandler.show();
        }

        this.storage.setItem('supermarket_customerId', JSON.stringify(this.customerId));

        this.unbindEvents();
        this.bindEvents();
    }

    bindEvents() {
        $('body').on('productviewed', this.onProductViewed);
        $('#recently-viewed-dropdown').on('opened.fndtn.dropdown', this.onDropdownOpened);
    }

    unbindEvents() {
        $('body').off('productviewed', this.onProductViewed);
        $('#recently-viewed-dropdown').off('opened.fndtn.dropdown', this.onDropdownOpened);
    }

    onProductViewed(event, productId) {
        try {
            if (!this.productIds.includes(productId)) {
                this.productIds.unshift(productId);
                this.storage.setItem('supermarket_recentlyViewedProducts', JSON.stringify(this.productIds));
            }
            this.dropdownHandler.show();
        } catch (e) {
            console.error(e);
        }
    }

    async onDropdownOpened(event, $dropdown) {
        const loadingClass = 'is-loading';
        const $loading = $('<div class="loadingOverlay"></div>');

        $dropdown.addClass(loadingClass).html($loading);
        $loading.show();

        if (this.customerId && this.customerRecentlyViewedProductIds.length === 0) {
            this.customerRecentlyViewedProductIds = await new Promise(resolve => {
                utils.api.getPage('/', {
                    template: 'papa-supermarket/recently-viewed-products/customer-product-ids',
                    config: {
                        customer: {
                            recently_viewed_products: true,
                        },
                    },
                }, (err, resp) => {
                    resolve(String($(resp).data('productIds')).split(',').map(s => Number(s)).filter(i => i));
                });
            });
        }

        const productIds = uniq([...this.customerRecentlyViewedProductIds, ...this.productIds]).slice(0, 50);

        const formatPrice = (prices, currency) =>
            (prices.priceRange.min.value !== prices.priceRange.max.value ? `
                <div class="price-section">
                    <span class="price price--main">${currencyFormat(prices.priceRange.min.value, currency)}  - ${currencyFormat(prices.priceRange.max.value, currency)}</span>
                </div>
            ` : `
                <div class="price-section">
                    <span class="price price--main">${currencyFormat(prices.price.value, currency)}</span>
                </div>
                ${prices.basePrice.value !== prices.price.value ? `
                    <div class="price-section non-sale-price">
                        <span class="price price--non-sale">
                            ${currencyFormat(prices.basePrice.value)}
                        </span>
                    </div>
                ` : ''}
            `);

        const cacheKey = productIds.join(',');

        if (!cache[cacheKey]) {
            cache[cacheKey] = await new Promise(resolve => {
                $.ajax({
                    url: '/graphql',
                    method: 'POST',
                    data: JSON.stringify({
                        query: `
                            query recentlyViewedProducts(
                                $productIds: [Int!]
                                $first: Int
                                $currencyCode: currencyCode!
                            ) {
                                site {
                                    products(entityIds: $productIds, first: $first) {
                                        edges {
                                            node {
                                                entityId
                                                name
                                                sku
                                                path
                                                pricesWithTax: prices(includeTax: true, currencyCode: $currencyCode) {
                                                    price {
                                                        ...MoneyFields
                                                    }
                                                    basePrice {
                                                        ...MoneyFields
                                                    }
                                                    salePrice {
                                                        ...MoneyFields
                                                    }
                                                    retailPrice {
                                                        ...MoneyFields
                                                    }
                                                    priceRange {
                                                        min {
                                                            ...MoneyFields
                                                        }
                                                        max {
                                                            ...MoneyFields
                                                        }
                                                    }
                                                }
                                                pricesWithoutTax: prices(includeTax: false, currencyCode: $currencyCode) {
                                                    price {
                                                        ...MoneyFields
                                                    }
                                                    basePrice {
                                                        ...MoneyFields
                                                    }
                                                    salePrice {
                                                        ...MoneyFields
                                                    }
                                                    retailPrice {
                                                        ...MoneyFields
                                                    }
                                                    priceRange {
                                                        min {
                                                            ...MoneyFields
                                                        }
                                                        max {
                                                            ...MoneyFields
                                                        }
                                                    }
                                                }
                                                defaultImage {
                                                    ...ImageFields
                                                }
                                            }
                                        }
                                    }
                                    settings {
                                        tax {
                                            plp
                                        }
                                    }
                                    currency(currencyCode: $currencyCode) {
                                        display {
                                            symbol
                                            symbolPlacement
                                            decimalToken
                                            thousandsToken
                                            decimalPlaces
                                        }
                                    }
                                }
                            }
                            fragment MoneyFields on Money {
                                value
                                currencyCode
                            }
                            fragment ImageFields on Image {
                                url80wide: url(width: 80)
                                url160wide: url(width: 160)
                                url320wide: url(width: 320)
                                url640wide: url(width: 640)
                            }
                        `,
                        variables: {
                            productIds,
                            first: productIds.length,
                            currencyCode: this.currencyCode,
                        },
                    }),
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${this.graphQLToken}`,
                    },
                    xhrFields: {
                        withCredentials: true,
                    },
                    success: (resp) => {
                        const currency = {
                            currency_token: resp.data.site.currency.display.symbol,
                            currency_location: String(resp.data.site.currency.display.symbolPlacement).toLowerCase(),
                            decimal_token: resp.data.site.currency.display.decimalToken,
                            decimal_places: resp.data.site.currency.display.decimalPlaces,
                            thousands_token: resp.data.site.currency.display.thousandsToken,
                        };
                        const products = resp.data.site.products.edges
                            .map(({ node }, index) => ({
                                index,
                                id: node.entityId,
                                name: node.name,
                                url: node.path,
                                defaultImage: node.defaultImage,
                                price: !this.restrictToLogin && node.pricesWithoutTax && node.pricesWithTax ? {
                                    value: resp.data.site.settings.tax.plp === 'EX' ? node.pricesWithoutTax.price.value : node.pricesWithTax.price.value,
                                    formatted: formatPrice(resp.data.site.settings.tax.plp === 'EX' ? node.pricesWithoutTax : node.pricesWithTax, currency),
                                } : null,
                            }));
                        const heading = this.dropdownHandler.attr('title');
                        const html = Mustache.render(this.template, { products, heading });
                        resolve(html);
                    },
                    error: () => {
                        resolve('');
                    },
                });
            });
        }

        $dropdown.html(cache[cacheKey]).removeClass(loadingClass);
    }
}

export default function (context) {
    try {
        const customerRecentlyViewedProductIds = String(context.customerRecentlyViewedProductIds).split(',').map(s => Number(s)).filter(i => i);
        const { graphQLToken, currencyCode, customerId } = context;
        const restrictToLogin = !context.customerId && context.themeSettings.restrict_to_login;

        if (!instance) {
            instance = new RecentlyViewedProducts({
                customerRecentlyViewedProductIds,
                graphQLToken,
                currencyCode,
                customerId,
                restrictToLogin,
            });
        }
        return instance;
    } catch (e) {
        console.error(e);
    }
}
