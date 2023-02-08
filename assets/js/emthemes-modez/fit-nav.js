import { debounce } from 'lodash';
import Mustache from 'mustache';

const tpl = `
    {{#list.length}}
        <ul class="navPage-subMenu-list">
            <li class="navPage-subMenu-item"></li>
            {{#list}}
                <li class="navPage-subMenu-item">
                    <a class="navPage-subMenu-action navPages-action {{#children.length}}has-subMenu is-open{{/children.length}}" href="{{&url}}">
                        {{title}}
                        {{#children.length}}
                            <i class="icon navPages-action-moreIcon" aria-hidden="true"><svg><use xlink:href="#icon-chevron-down"></use></svg></i>
                        {{/children.length}}
                    </a>
                    {{> childrenTpl }}
                </li>
            {{/list}}
        </ul>
    {{/list.length}}
`;

const childrenTpl = `
    {{#children.length}}
        <ul class="navPage-childList is-open">
            {{#children}}
                <li class="navPage-childList-item">
                    <a class="navPage-childList-action navPages-action {{#children.length}}has-subMenu is-open{{/children.length}}" href="{{&url}}">
                        {{title}}
                        {{#children.length}}
                            <i class="icon navPages-action-moreIcon" aria-hidden="true"><svg><use xlink:href="#icon-chevron-down"></use></svg></i>
                        {{/children.length}}
                    </a>
                    {{#children.length}}
                        {{> childrenTpl }}
                    {{/children.length}}
                </li>
            {{/children}}
        </ul>
    {{/children.length}}
`;

export default function (context) {
    const $navPages = $('.navPages').first();
    const $navPagesList = $navPages.children('.navPages-list');
    const $vertCat = $navPages.children('.emthemesModez-navPages-verticalCategories-container');
    const $list = $('<ul/>')
        .addClass($navPagesList.first().attr('class'))
        .addClass('navPages-list--fitNav')
        .append($navPagesList.not('.navPages-list--user').children('.navPages-item').clone());

    if ($list.children().length === 0) {
        return;
    }

    if ($vertCat.length > 0) {
        $vertCat.after($list);
    } else {
        $navPages.prepend($list);
    }
    
    const txtMore = context.txtNavMore || 'More';
    const $more = $(`
        <li class="navPages-item navPages-item--more">
            <a class="navPages-action has-subMenu is-open" href="#">${txtMore} <i class="icon navPages-action-moreIcon" aria-hidden="true"><svg><use xlink:href="#icon-chevron-down"></use></svg></i></a>
            <div class="navPage-subMenu is-open"></div>
        </li>`);
    $list.append($more);

    const resize = () => {
        $more.show();
        $more.nextAll().show();

        //
        // Move 'More' to the first line of the menu
        //
        const firstTop = Math.round($list.children().first().position().top);
        $more.appendTo($list);
        while (Math.round($more.position().top) > firstTop) {
            $more.insertBefore($more.prev());
        }

        // Hide all menu items after 'More'
        $more.nextAll().hide();

        //
        // Extract data from the menu items after 'more' item
        //
        const data = $more.nextAll().get().map((item1) => {
            const $item1 = $(item1);
            const $a1 = $item1.find('> .navPages-action');

            const children1 = $item1.find('> .navPage-subMenu > .navPage-subMenu-list > .navPage-subMenu-item').not(':first').get().map((item2) => {
                const $item2 = $(item2);
                const $a2 = $item2.find('> .navPage-subMenu-action');

                const children2 = $item2.find('> .navPage-childList > .navPage-childList-item').not(':first').get().map((item3) => {
                    const $item3 = $(item3);
                    const $a3 = $item3.find('> .navPage-childList-action');

                    const children3 = $item3.find('> .navPage-childList > .navPage-childList-item').not(':first').get().map((item4) => {
                        const $item4 = $(item4);
                        const $a4 = $item4.find('> .navPage-childList-action');

                        return {
                            url: $a4.attr('href'),
                            title: $a4.text(),
                            children: [],
                        };
                    });

                    return {
                        url: $a3.attr('href'),
                        title: $a3.text(),
                        children: children3,
                    };
                });

                return {
                    url: $a2.attr('href'),
                    title: $a2.text(),
                    children: children2,
                };
            });

            return {
                url: $a1.attr('href'),
                title: $a1.text(),
                children: children1,
            };
        });

        // Build the new mega menu HTML
        const html = Mustache.render(tpl, { list: data }, { childrenTpl });
        $more.find('> .navPage-subMenu').html(html);

        if (data.length === 0) {
            $more.hide();
        }
    };

    $(window).on('resize', debounce(resize, 200));
    resize();
}
