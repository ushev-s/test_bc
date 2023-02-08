import $ from 'jquery';
import utils from '@bigcommerce/stencil-utils';

export default class AZBrands {
    onReady() {
        const $brands = $('[data-brands-list]');
        if ($brands.length > 0) {
            const $azBrands = $(document.getElementById($brands.data('azbrands')));
            if ($azBrands.length > 0) {
                this.generateAZBrands($azBrands);
                this.updateAZBrands($brands, $azBrands);
            }

            const url = $brands.data('brands-list-next');
            if (url) {
                this.loadMoreBrands($brands, url, true);
            }
        }
    }

    generateAZBrands($azBrands) {
        const azBrandsTableID = `${$azBrands.attr('id')}Table`;
        const $azBrandsTable = $(`#${azBrandsTableID}`);

        $azBrandsTable.append('<li data-letter=""><a href="#">All</a></li>');

        for (let i = 97; i <= 123; i++) {
            let ch = '#';
            if (i < 123) {
                ch = String.fromCharCode(i);
            }
            $azBrands.append(`<div class="azBrands-group" data-letter="${ch}" id="azBrands-code-${i}"><h3 class="azBrands-group-title">${ch}</h3><ul class="brandGrid"></ul><p class="azBrands-group-topLink"><a href="#topOfPage">Top of Page</a></p></div>`);
            $azBrandsTable.append(`<li data-letter="${ch}"><a href="#azBrands-code-${i}" data-target="azBrands-code-${i}">${ch}</a></li>`);
        }

        $azBrands.children().addClass('is-active');
        $azBrandsTable.children().first().addClass('is-active');

        $azBrandsTable.on('click', 'a', (event) => {
            event.preventDefault();

            const $a = $(event.target);

            $azBrandsTable.children('li').removeClass('is-active');
            $a.addClass('is-active');

            const target = $a.data('target');
            if (target) {
                $azBrands.children('.azBrands-group').removeClass('is-active');
                $azBrands.children(`#${target}`).addClass('is-active');
            } else {
                $azBrands.children('.azBrands-group').addClass('is-active');
            }
        });
    }

    updateAZBrands($brands, $azBrands) {
        const $azBrandsTable = $(`#${$azBrands.attr('id')}Table`);
        $brands.children('.brand').each((i, el) => {
            const $el = $(el);
            const code = String($el.data('brand-code'));
            const letter = code.charAt(0).toLowerCase();

            let $group = $azBrands.children(`[data-letter=${letter}]`);
            if ($group.length === 0) {
                $group = $azBrands.children().last();
            }

            let $li = $azBrandsTable.children(`[data-letter=${letter}]`);
            if ($li.length === 0) {
                $li = $azBrandsTable.children().last();
            }

            const $brandGrid = $group.find('.brandGrid');

            let $elIns;
            $brandGrid.children('.brand').each((j, el2) => {
                const $el2 = $(el2);
                const code2 = $el2.data('brand-code');

                if (code < code2) {
                    $elIns = $el2;
                } else {
                    return false;
                }
            });
            if ($elIns) {
                $el.insertAfter($elIns);
            } else {
                $el.appendTo($brandGrid);
            }
        });
    }

    loadMoreBrands($brands, url, recursive) {
        utils.api.getPage(url, {
            template: 'papa-supermarket/brands/brands-list',
            config: {
                brands: {
                    limit: 100,
                },
            },
        }, (err, resp) => {
            const $brandsList = $(resp).find('[data-brands-list]');
            $brands.append($brandsList.children());

            const $azBrands = $(document.getElementById($brands.data('azbrands')));
            if ($azBrands.length > 0) {
                this.updateAZBrands($brands, $azBrands);
            }

            const nextUrl = $brandsList.data('brands-list-next');
            if (nextUrl && recursive) {
                this.loadMoreBrands($brands, nextUrl, recursive);
            }
        });
    }
}
