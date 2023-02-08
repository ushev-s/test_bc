import { api } from '@bigcommerce/stencil-utils';
import { debounce } from 'lodash';
import Url from 'url';
import urlUtils from '../theme/common/url-utils';

export default class SearchInCategory {
    /**
     * Constructor
     *
     * Should be constructed after FacetedSearch object constructed
     * so that FacetedSearch `statechange` event callback can be executed.
     *
     * `options` includes:
     * - (object) `context`: from PageManager.context.
     * - (object) `facetedSearch`
     * - (function) `searchCallback`: callback to re-render search results.
     *
     * @param {object} options
     */
    constructor(options) {
        // console.log('search-in-category constructor');
        this.doSearch = debounce(this.doSearch.bind(this), 500);
        this.onInput = this.onInput.bind(this);
        this.onFormSubmit = this.onFormSubmit.bind(this);
        this.onClear = this.onClear.bind(this);
        this.onStateChange = this.onStateChange.bind(this);
        this.options = options;
        this.$body = $('body');
        this.$input = $('[data-search-in-category]');
        this.$form = this.$input.closest('form');
        this.$clear = this.$form.find('[data-clear]').hide();
        this.originalPathname = window.location.pathname;

        if (options && options.facetedSearch) {
            this.options.facetedSearch.updateViewCallback = this.updateViewFacetedSearch.bind(this);
        }

        this.bindEvents();

        const url = Url.parse(urlUtils.getUrl(), true);
        if (url.query.q) {
            this.$input.val(url.query.q);
            this.$clear.show();
            $(window).trigger('statechange');
        }
    }

    destroy() {
        // console.log('search-in-category destroy');
        this.unbindEvents();
    }

    bindEvents() {
        this.$input.on('input', this.onInput);
        this.$form.on('submit', this.onFormSubmit);
        this.$clear.on('click', this.onClear);

        if ($('#facetedSearch').length === 0) {
            $(window).on('statechange', this.onStateChange);
        }
    }

    unbindEvents() {
        this.$input.off('input', this.onInput);
        this.$form.off('submit', this.onFormSubmit);
        this.$clear.off('click', this.onClear);
        $(window).off('statechange', this.onStateChange);
    }

    onFormSubmit() {
        return false;
    }

    onClear(event) {
        event.preventDefault();
        this.$clear.hide();
        this.$input.val('');
        this.onInput();
    }

    onInput() {
        this.doSearch(this.$input.val());
    }

    onStateChange() {
        // console.log('search-in-category statechange');
        let searchUrl = urlUtils.getUrl();
        const url = Url.parse(searchUrl, true);
        const searchQuery = url.query.search_query || url.query.search_query_adv || url.query.q;
        let requestOptions = {
            template: {
                productListing: 'category/product-listing',
                sidebar: 'category/sidebar',
            },
        };

        if (searchQuery) {
            url.query.search_query_adv = searchQuery;

            delete url.query.search_query;
            delete url.query.q;
            delete url.query.category;

            if (this.options.context.categoryId) {
                url.query['category[]'] = this.options.context.categoryId;
            } else {
                delete url.query['category[]'];
            }

            if (this.options.context.themeSettings.categorypage_search_subs) {
                url.query.searchsubs = 'ON';
            }

            searchUrl = `/search.php?${urlUtils.buildQueryString(url.query)}`;

            requestOptions = {
                template: {
                    productListing: 'papa-supermarket/search-in-category/product-listing',
                    sidebar: 'papa-supermarket/search-in-category/sidebar',
                },
                showMore: 'search/show-more',
            };
        }

        this.$form.addClass('loading');
        this.$body.trigger('beforerequest.searchincategory');

        api.getPage(searchUrl, requestOptions, (err, content) => {
            this.$form.removeClass('loading');

            if (err) {
                throw new Error(err);
            }

            this.$body.trigger('beforeupdate.searchincategory');

            if (content && this.options.searchCallback) {
                this.options.searchCallback(content);
            }

            this.$body.trigger('afterupdate.searchincategory');
        });
    }

    doSearch(searchQuery) {
        if (searchQuery.length === 0) {
            this.$clear.hide();
            const url = urlUtils.removeParams(urlUtils.getUrl(), ['q', 'search_query', 'search_query_adv', 'category', 'page']);
            urlUtils.goToUrl(url);
        } else if (searchQuery.length >= 3) {
            this.$clear.show();
            let url = urlUtils.removeParams(urlUtils.getUrl(), ['q', 'search_query', 'search_query_adv', 'page']);
            url = urlUtils.replaceParams(url, { q: searchQuery });
            urlUtils.goToUrl(url);
        }
    }

    updateViewFacetedSearch() {
        const facetedSearch = this.options.facetedSearch;
        let requestUrl = urlUtils.getUrl();
        let requestOptions = facetedSearch.requestOptions;
        const url = Url.parse(requestUrl, true);
        const searchQuery = url.query.q || url.query.search_query;

        // Check if the URL is 'Clear All', then clear the search query as well
        const stdParams = ['_bc_fsnf', 'search_query', 'q', 'sort', 'limit', 'mode', 'page'];
        const filterParams = Object.keys(url.query).filter(key => stdParams.indexOf(key) === -1);
        const isClearAll = window.location.pathname === '/search.php' && filterParams.length === 0;

        if (isClearAll) {
            this.$input.val('');
            this.$clear.hide();
            requestUrl = urlUtils.removeParams(requestUrl, [...filterParams, 'search_query', 'q', '_bc_fsnf']).replace('/search.php', this.originalPathname);
            window.history.replaceState({}, document.title, requestUrl);
        } else if (searchQuery) {
            // Show nice URL on the location bar
            if (window.location.pathname === '/search.php') {
                url.query.q = searchQuery;
                delete url.query.search_query;
                if (Number(url.query.category) === this.options.context.categoryId) {
                    delete url.query.category;
                }
                window.history.replaceState({}, document.title, `${this.originalPathname}?${urlUtils.buildQueryString(url.query)}`);
            }

            delete url.query.q;
            url.query.search_query = searchQuery;
            if (!url.query.category) {
                url.query.category = this.options.context.categoryId;
            }

            requestUrl = `/search.php?${urlUtils.buildQueryString(url.query)}`;
            requestOptions = {
                template: {
                    productListing: 'papa-supermarket/search-in-category/product-listing',
                    sidebar: 'papa-supermarket/search-in-category/sidebar',
                },
                showMore: 'search/show-more',
            };
        } else {
            this.$input.val('');
        }

        $(facetedSearch.options.blockerSelector).show();
        this.$form.addClass('loading');

        this.$body.trigger('beforerequest.searchincategory');

        api.getPage(requestUrl, requestOptions, (err, content) => { // Supermarket MOD
            $(facetedSearch.options.blockerSelector).hide();
            this.$form.removeClass('loading');

            if (err) {
                throw new Error(err);
            }

            this.$body.trigger('beforeupdate.searchincategory');

            // Refresh view with new content
            facetedSearch.refreshView(content);

            this.$body.trigger('afterupdate.searchincategory');
        });
    }
}
