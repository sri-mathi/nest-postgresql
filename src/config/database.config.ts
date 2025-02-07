export const databaseConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'sample',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'pranesh',
  };
  