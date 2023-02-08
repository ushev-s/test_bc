var webpack = require('webpack');

/**
 * Watch options for the core watcher
 * @type {{files: string[], ignored: string[]}}
 */
var watchOptions = {
    // If files in these directories change, reload the page.
    files: [
        '/templates',
        '/lang',
    ],

    //Do not watch files in these directories
    ignored: [
        '/assets/scss',
        '/assets/less',
        '/assets/css',
        '/assets/dist',
    ]
};

function validateSchema() {
    console.log("Validating schema.json...");
    
    var config = require('./config.json');
    var schema = require('./schema.json');
    var keys = [];
    var err = false;

    schema.forEach((group, i) => {
        if (!group.name) {
            console.error(`Group '{$i}'-nth has no 'name'`);
            err = true;
        }

        if (!group.settings || !(group.settings instanceof Array)) {
            console.error(`Group '${group.name}' has no/invalid 'settings' key`);
            err = true;
        } else {
            group.settings.forEach((item, j) => {
                if (!item.type || ['heading', 'color', 'select', 'font', 'text', 'checkbox', 'imageDimension', 'paragraph', 'optimizedCheckout-image'].indexOf(item.type) === -1) {
                    console.error(`Setting '${item.id}' in group '${group.name}' has no/invalid 'type' (${item.type})`);
                    err = true;
                }

                if (!item.id && item.type !== 'heading' && item.type !== 'paragraph') {
                    console.error(`Setting '${item.id}' in group '${group.name}' has no 'id'`);
                    err = true;
                }

                if (item.id && !(item.id in config.settings)) {
                    console.error(`Setting '${item.id}' in group '${group.name}' has undefined 'id' in config.json`);
                    err = true;
                }

                if (item.id && keys.indexOf(item.id) > -1) {
                    console.error(`Setting '${item.id}' in group '${group.name}' has duplicated 'id'`);
                    err = true;
                }

                if (typeof item.label === 'undefined' && item.type !== 'heading' && item.type !== 'paragraph') {
                    console.error(`Setting '${item.id}' in group '${group.name}' has no 'label'`);
                    err = true;
                }

                if (!item.content && (item.type === 'heading' || item.type === 'paragraph')) {
                    console.error(`Heading item '${j}' in group '${group.name}' has no 'content'`);
                    err = true;
                }

                if ((!item.options || item.options.length === 0) && (item.type === 'select' || item.type === 'font')) {
                    console.error(`Setting '${item.id}' in group '${group.name}' has no 'options'`);
                    err = true;
                }

                if (item.options instanceof Array) {
                    var values = [];
                    item.options.forEach(option => {
                        if (!option.label) {
                            console.error(`Setting '${item.id}' in group '${group.name}' has no option label`);
                            err = true;
                        }

                        if (typeof option.value === 'undefined') {
                            console.error(`Setting '${item.id}' has no option value in schema`);
                            err = true;
                        }

                        if (values.indexOf(option.value) > -1) {
                            console.error(`Setting '${item.id}' has duplicated option value in schema`);
                            err = true;
                        }

                        values.push(option.value);
                    });

                    if (item.id in config.settings && values.indexOf(config.settings[item.id]) === -1) {
                        console.error(`Setting '${item.id}' has value not exist in schema`);
                        err = true;
                    }

                    config.variations.forEach(variation => {
                        if (item.id in variation.settings && values.indexOf(variation.settings[item.id]) === -1) {
                            console.error(`Setting '${item.id}' of variation '${variation.name}' has value not exist in schema`);
                            err = true;
                        }
                    });
                }

                if (item.type === 'text' && typeof config.settings[item.id] !== 'string') {
                    console.error(`Setting '${item.id}' in group '${group.name}' has value type is not string`);
                    err = true;
                }

                if (item.id) {
                    keys.push(item.id);
                }
            });
        }
    });

    return !err;
}

/**
 * Watch any custom files and trigger a rebuild
 */
function development() {
    validateSchema();

    var devConfig = require('./webpack.dev.js');

    // Rebuild the bundle once at bootup
    webpack(devConfig).watch({}, (err, stats) => {
        if (err) {
            console.error(err.message, err.details);
        }

        if (stats.hasErrors()) {
            console.error(stats.toString({ all: false, errors: true, colors: true }));
        }

         if (stats.hasWarnings()) {
            console.error(stats.toString({ all: false, warnings: true, colors: true }));
        }

        process.send('reload');
    });
}

/**
 * Hook into the `stencil bundle` command and build your files before they are packaged as a .zip
 */
function production() {
    var prodConfig = require('./webpack.prod.js');

    webpack(prodConfig).run((err, stats) => {
        if (err) {
            console.error(err.message, err.details);
            process.exit(1);
            return;
        }

        if (stats.hasErrors()) {
            console.error(stats.toString({ all: false, errors: true, colors: true }));
            process.exit(1);
            return;
        }

         if (stats.hasWarnings()) {
            console.error(stats.toString({ all: false, warnings: true, colors: true }));
        }

        process.send('done');
    });
}

if (process.send) {
    // running as a forked worker
    process.on('message', message => {
        if (message === 'development') {
            development();
        }

        if (message === 'production') {
            production();
        }
    });

    process.send('ready');
}

module.exports = { watchOptions };
