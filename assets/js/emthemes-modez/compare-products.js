import Mustache from 'mustache';

let singleton;

const compareListTmpl = `
    <div class="supermarket-compareList-panel-wrapper is-empty" id="supermarketCompareList">
        <div class="supermarket-compareList-panel">
            <div class="supermarket-compareList-panel-body">
                <div class="supermarket-compareList" data-compare-product-list>{{{renderItems}}}</div>
                <div class="supermarket-compareList-actions">
                    <a href="{{compare_url}}" class="button button--primary button--small button--compare" data-compare-product-button>{{compare}}</a>
                    <button type="button" class="button button--secondary button--small button--clearAll" data-compare-product-clearall>{{clear_all}}</button>
                </div>
            </div>
            <button type="button" class="button button--close" data-compare-product-toggle><i class="fa fa-chevron-down"></i><span class="is-srOnly">Close</span></button>
            <button type="button" class="button button--open" data-compare-product-toggle><i class="fa fa-chevron-up"></i><span class="is-srOnly">Open</span></button>
        </div>
    </div>
`;

const compareListItemTmpl = `
    <div class="supermarket-compareList-item" data-compare-product-item="{{id}}">
        <img class="supermarket-compareList-img" src="{{image}}" alt="{{alt}}" title="{{alt}}">
        <button type="button" class="supermarket-compareList-quickview quickview" data-product-id="{{id}}"><i class="fa fa-search-plus"></i><span class="is-srOnly">{{quick_view}}</span></button>
        <button type="button" class="supermarket-compareList-remove" data-compare-product-remove="{{id}}"><i class="fa fa-trash"></i><span class="is-srOnly">{{remove}}</span></button>
    </div>
`;

class CompareProducts {
    constructor(context) {
        this.context = context;
        this.animationTime = 300;
        this.$body = $('body');

        this.products = this.loadProductsFromLocalStorage() || [];

        this.$scope = $(Mustache.render(compareListTmpl, {
            compare: context.compareAddonLang_compare,
            clear_all: context.compareAddonLang_clear_all,
            renderItems: () => this.products.map(product => this.renderItem(product)).join(''),
        }));

        if (this.products.length === 0) {
            this.$scope.addClass('is-empty').hide();
        } else {
            this.$scope.removeClass('is-empty').show();
        }

        this.$body.append(this.$scope);

        this.$productList = this.$scope.find('[data-compare-product-list]');
        this.$compareButton = this.$scope.find('[data-compare-product-button]');

        this.updateCompareUrl();

        this.bindEvents();
    }

    loadProductsFromLocalStorage() {
        if (!window.localStorage) {
            return;
        }
        const s = window.localStorage.getItem('compareProducts');
        if (s) {
            try {
                return JSON.parse(s);
            } catch (e) {
                return null;
            }
        } else {
            return null;
        }
    }

    saveProductsToLocalStorage() {
        if (!window.localStorage) {
            return;
        }
        window.localStorage.setItem('compareProducts', JSON.stringify(this.products));
    }

    bindEvents() {
        this.$body.on('click', '[data-compare-id]', event => {
            event.preventDefault();
            const $el = $(event.currentTarget);
            const id = Number($el.data('compareId'));

            if (this.products.filter(item => item.id === id).length === 0) {
                this.addProduct({
                    image: $el.data('compareImage'),
                    alt: $el.data('compareTitle'),
                    id,
                });
            }

            this.$scope.removeClass('is-closed');
        });

        this.$scope.on('click', '[data-compare-product-remove]', event => {
            event.preventDefault();
            const $el = $(event.currentTarget);
            const id = Number($el.data('compareProductRemove'));
            this.removeProduct(id);

            this.$scope.removeClass('is-closed');
        });

        this.$scope.find('[data-compare-product-toggle]').on('click', event => {
            event.preventDefault();
            this.$scope.toggleClass('is-closed');
        });

        this.$scope.find('[data-compare-product-clearall]').on('click', event => {
            event.preventDefault();
            this.clearAllProducts();
        });
    }

    addProduct(product) {
        this.products.push(product);
        this.saveProductsToLocalStorage();
        this.updateCompareUrl();

        const $el = $(this.renderItem(product)).hide();

        this.$productList.append($el);

        $el.show(this.animationTime, () => {
            this.$scope.removeClass('is-empty').fadeIn(this.animationTime);
        });
    }

    removeProduct(id) {
        this.products = this.products.filter(item => item.id !== id);
        this.saveProductsToLocalStorage();
        this.updateCompareUrl();

        const $el = this.$scope.find(`[data-compare-product-item=${id}]`);
        $el.fadeOut(this.animationTime, () => {
            $el.remove();

            if (this.products.length === 0) {
                this.$scope.addClass('is-empty').fadeOut(this.animationTime);
            }
        });
    }

    clearAllProducts() {
        this.products = [];
        this.saveProductsToLocalStorage();
        this.updateCompareUrl();

        const $el = this.$scope.find('[data-compare-product-item]');
        $el.fadeOut(this.animationTime, () => {
            $el.remove();
            this.$scope.addClass('is-empty').fadeOut(this.animationTime);
        });
    }

    updateCompareUrl() {
        const path = this.products.map(product => product.id).join('/');
        this.$compareButton.attr('href', `${this.context.urls.compare}/${path}`);
    }

    renderItem(item) {
        return Mustache.render(compareListItemTmpl, {
            ...item,
            quick_view: this.context.compareAddonLang_quick_view,
            remove: this.context.compareAddonLang_remove,
        });
    }
}

export default function compareProducts(context) {
    if (!singleton) {
        singleton = new CompareProducts(context);
    }
    return singleton;
}
