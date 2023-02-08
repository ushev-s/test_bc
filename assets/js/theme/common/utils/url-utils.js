import Url from 'url';

const urlUtils = {
    getUrl: () => `${window.location.pathname}${window.location.search}`,

    goToUrl: (url) => {
        window.history.pushState({}, document.title, url);
        $(window).trigger('statechange');
    },

    replaceParams: (url, params) => {
        const parsed = Url.parse(url, true);
        let param;

        // Let the formatter use the query object to build the new url
        parsed.search = null;

        for (param in params) {
            if (params.hasOwnProperty(param)) {
                parsed.query[param] = params[param];
            }
        }

        // supermarket: Fix url encode RFC 3986
        if (parsed.query) {
            parsed.search = urlUtils.buildQueryString(parsed.query);
            delete parsed.query;
        }

        return Url.format(parsed);
    },

    // Supermarket
    removeParams: (url, params) => {
        const parsed = Url.parse(url, true);

        // Let the formatter use the query object to build the new url
        parsed.search = null;

        if (typeof params === 'string') {
            if (parsed.query.hasOwnProperty(params)) {
                parsed.query[params] = null;
                delete parsed.query[params];
            }
        } else if (typeof params === 'object') {
            params.forEach(param => {
                if (parsed.query.hasOwnProperty(param)) {
                    parsed.query[param] = null;
                    delete parsed.query[param];
                }
            });
        }

        // supermarket: Fix url encode RFC 3986
        if (parsed.query) {
            parsed.search = urlUtils.buildQueryString(parsed.query);
            delete parsed.query;
        }

        return Url.format(parsed);
    },

    // supermarket: Fix faceted value contains both + and a spacing character (ie. "DVD+R DL")
    encodeParam: (val) => encodeURIComponent(val).split('%20').join('+').replace(/[!'()*]/g, c => `%${c.charCodeAt(0).toString(16)}`),

    buildQueryString: (queryData) => {
        let out = '';
        let key;
        for (key in queryData) {
            if (queryData.hasOwnProperty(key)) {
                if (Array.isArray(queryData[key])) {
                    let ndx;

                    for (ndx in queryData[key]) {
                        if (queryData[key].hasOwnProperty(ndx)) {
                            out += `&${urlUtils.encodeParam(key)}=${urlUtils.encodeParam(queryData[key][ndx])}`; // supermarket mod
                        }
                    }
                } else {
                    out += `&${urlUtils.encodeParam(key)}=${urlUtils.encodeParam(queryData[key])}`; // supermarket mod
                }
            }
        }

        return out.substring(1);
    },
};

export default urlUtils;
