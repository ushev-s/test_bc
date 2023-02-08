export default class PageManager {
    constructor(context) {
        this.context = context;

        // Supermarket
        $('body').one('beforeload.instantload', () => this.destroy());
    }

    type() {
        return this.constructor.name;
    }

    onReady() {
    }

    // Supermarket
    destroy() {
    }

    static load(context) {
        const page = new this(context);

        $(document).ready(() => {
            page.onReady.bind(page)();
        });
    }
}
