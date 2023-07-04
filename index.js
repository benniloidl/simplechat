const app = require('express')();
const { v4 } = require('uuid');

app.get('/', (req, res) => {
    const path = `/api/item/${ v4() }`;
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Cache-Control', 's-max-age=1, stale-while-revalidate');
    res.end(`Hello! Go to item: <a href="${ path }">${ path }</a>`);
});

module.exports = app;