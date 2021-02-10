// webpack.config.js
const path = require( 'path' );
module.exports = {
    context: __dirname,
    entry:{
        'socket-consumer': './dist/cjs/index.js',
    },
    output: {
        path: path.resolve( __dirname, 'dist', 'browser' ),
        filename: '[name].js',
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /node_modules/,
                use: 'babel-loader',
            }
        ]
    }
};
