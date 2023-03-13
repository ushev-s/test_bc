import PageManager from '../page-manager';
import urlUtils from './common/utils/url-utils';
import Url from 'url';

export default class CatalogPage extends PageManager {
    onSortBySubmit(event, currentTarget) {
        const url = Url.parse(window.location.href, true);
        /* MOD by papathemes - supermarket
        ---
        const queryParams = $(currentTarget).serialize().split('=');

        url.query[queryParams[0]] = queryParams[1];
        ---
        */
        const queryParams = $(currentTarget).serializeArray();
        queryParams.forEach(param => {
            url.query[param.name] = param.value;
        });
        /* END MOD */
        delete url.query.page;

        event.preventDefault();
        event.isDefaultPrevented = true; /* eslint-disable-line */ // papathemes-supermarket: quickfix stop stencil-utils SortByHook submitting the form when select changed
        window.location = Url.format({ pathname: url.pathname, search: urlUtils.buildQueryString(url.query) });
    }
}
