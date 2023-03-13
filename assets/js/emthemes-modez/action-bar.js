import $ from 'jquery';
import Url from 'url';
import urlUtils from '../theme/common/utils/url-utils';

let instantloadBinded = false;
let actionBar;

function removeModeClass(index, className) {
    return (className.match(/(^|\s)mode-\S+/g) || []).join(' ');
}

class ActionBar {
    constructor(options = {}) {
        // console.log('actionbar constructor');
        this.onModeChange = this.onModeChange.bind(this);
        this.options = options;
        this.init();
    }

    init() {
        this.$sortBy = $('[data-sort-by]');

        if (!this.$sortBy.length) {
            return;
        }

        const $limit = this.$sortBy.find('[name=limit]');
        const $mode = this.$sortBy.find('input[name=mode]');
        const url = Url.parse(window.location.href, true);

        if (url.query.limit) {
            $limit.val(url.query.limit);
        }

        if (url.query.mode) {
            $mode.prop('checked', false)
                .filter(`[value=${url.query.mode}]`).prop('checked', true);
        }

        // Stop action bar if the page is category bulk order custom template
        const $body = $('body');
        if ($body.hasClass('papaSupermarket-page--pages-custom-category-bulk-order') || $body.hasClass('papaSupermarket-page--pages-custom-brand-bulk-order')) {
            return;
        }

        $('#product-listing-container')
            .removeClass(removeModeClass)
            .addClass(`mode-${$mode.filter(':checked').val()}`);

        this.unbindEvents();
        this.bindEvents();
    }

    reinit(newOptions) {
        // console.log('actionbar reinit');
        if (newOptions) {
            this.options = newOptions;
        }
        this.init();
    }

    destroy() {
        // console.log('actionbar destroyed');
        this.unbindEvents();
    }

    bindEvents() {
        this.$sortBy.find('input[name=mode]').on('change', this.onModeChange);
    }

    unbindEvents() {
        this.$sortBy.find('input[name=mode]').off('change', this.onModeChange);
    }

    onModeChange(event) {
        event.preventDefault();

        const mode = $(event.target).val();

        $('#product-listing-container')
            .removeClass(removeModeClass)
            .addClass(`mode-${mode}`);

        $('#product-listing-container .pagination-link').each((i, el) => {
            const $a = $(el);
            const url = urlUtils.replaceParams($a.attr('href'), { mode });
            $a.attr('href', url);
        });

        const url = Url.parse(window.location.href, true);
        url.query.mode = mode;
        window.history.pushState({}, document.title, Url.format({ pathname: url.pathname, search: urlUtils.buildQueryString(url.query) }));
    }
}

/**
 * Call this function when:
 * - Page is loaded
 * - Ajax page returned
 */
export default function actionBarFactory(options) {
    if (actionBar) {
        actionBar.reinit(options);
    } else {
        actionBar = new ActionBar(options);
    }

    // Destroy actionBar when loading new page
    if (!instantloadBinded) {
        $('body').on('beforeload.instantload', () => {
            if (actionBar) {
                actionBar.destroy();
                actionBar = null;
            }
        });
        instantloadBinded = true;
    }
}
