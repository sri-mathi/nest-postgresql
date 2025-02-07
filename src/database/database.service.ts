import { Injectable } from '@nestjs/common';
import { Pool } from 'pg';

@Injectable()
export class DatabaseService {
  private pool: Pool;

  constructor() {
    this.pool = new Pool({
      host: 'localhost',
      port: 5432,
      database: 'sample',
      user: 'postgres',
      password: 'pranesh',
    });
  }

  getPool() {
    return this.pool;
  }
}
