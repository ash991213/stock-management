module.exports = {
    apps: [
        {
            name: 'stock-management-8000',
            script: './dist/apps/stock/main.js',
            env: { PORT: 8000 },
        },
        {
            name: 'stock-management--8001',
            script: './dist/apps/stock/main.js',
            env: { PORT: 8001 },
        },
        {
            name: 'stock-management-8002',
            script: './dist/apps/stock/main.js',
            env: { PORT: 8002 },
        },
        {
            name: 'stock-management-8003',
            script: './dist/apps/stock/main.js',
            env: { PORT: 8003 },
        },
    ],
};
