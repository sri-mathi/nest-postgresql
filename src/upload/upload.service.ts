import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import * as csvParser from 'csv-parser';
import { Readable } from 'stream';

@Injectable()
export class UploadService {
  constructor(private readonly databaseService: DatabaseService) {}

  async processCsvFiles(files: Express.Multer.File[]) {
    try {
      if (!files || files.length === 0) {
        throw new Error('No files received for processing.');
      }

      const promises = files.map((file) => this.handleCsvFile(file));
      await Promise.all(promises);
    } catch (error) {
      console.error('Error processing CSV files:', error);
      throw error;
    }
  }

  private async handleCsvFile(file: Express.Multer.File) {
    try {
      const parsedData = await this.parseCsv(file);
      if (!parsedData || parsedData.length === 0) {
        throw new Error(`No data found in CSV file: ${file.originalname}`);
      }

      const tableName = file.originalname.replace('.csv', ''); 
      const columns = Object.keys(parsedData[0]);

      await this.createTable(tableName, columns);

      await this.insertData(tableName, columns, parsedData);

      console.log(`Successfully processed and inserted data from: ${file.originalname}`);
    } catch (error) {
      console.error(`Error handling CSV file (${file.originalname}):`, error);
    }
  }

  private async parseCsv(file: Express.Multer.File): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const results : any[]=[];
      const stream = Readable.from(file.buffer);

      stream
        .pipe(csvParser())
        .on('data', (data) => results.push(data))
        .on('end', () => resolve(results))
        .on('error', (error) => {
          console.error('CSV Parsing Error:', error);
          reject(error);
        });
    });
  }

  private async createTable(tableName: string, columns: string[]) {
    const columnDefinitions = columns.map((column) => `"${column}" VARCHAR(255)`).join(', ');

    const createTableQuery = `CREATE TABLE IF NOT EXISTS "${tableName}" (${columnDefinitions})`;
    try {
      await this.databaseService.getPool().query(createTableQuery);
      console.log(`Table "${tableName}" is ready.`);
    } catch (error) {
      console.error(`Error creating table "${tableName}":`, error);
      throw error;
    }
  }

  private async insertData(tableName: string, columns: string[], data: any[]) {
    const columnList = columns.map((col) => `"${col}"`).join(', ');
    const valuePlaceholders = columns.map((_, index) => `$${index + 1}`).join(', ');

    const insertQuery = `INSERT INTO "${tableName}" (${columnList}) VALUES (${valuePlaceholders})`;

    try {
      for (const row of data) {
        const values = columns.map((col) => row[col]); // Extract values in column order
        await this.databaseService.getPool().query(insertQuery, values);
      }
      console.log(`Inserted ${data.length} rows into "${tableName}"`);
    } catch (error) {
      console.error(`Error inserting data into table "${tableName}":`, error);
      throw error;
    }
  }

  async getColumnsForTables(tableNames: string[]): Promise<Record<string, string[]>> {
    try {
      if (!tableNames || tableNames.length === 0) {
        throw new Error('No table names provided.');
      }

      const placeholders = tableNames.map((_, index) => `$${index + 1}`).join(', ');
      const query = `
        SELECT table_name, column_name 
        FROM information_schema.columns 
        WHERE table_name IN (${placeholders})
        ORDER BY table_name, ordinal_position;
      `;

      const result = await this.databaseService.getPool().query(query, tableNames);

      const columnMap: Record<string, string[]> = {};

      result.rows.forEach(row => {
        if (!columnMap[row.table_name]) {
          columnMap[row.table_name] = [];
        }
        columnMap[row.table_name].push(row.column_name);
      });

      return columnMap;
    } catch (error) {
      console.error(`Error retrieving columns for tables: ${tableNames}`, error);
      throw error;
    }
  }

  async getTableColumnDataTypes(selectedTables: string[]): Promise<any> {

    const getColumnsQuery = `
      SELECT table_name, column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = ANY($1)
    `;
  
    try {
      const columns = await this.databaseService.getPool().query(getColumnsQuery, [selectedTables]);
      const output = {};
  
      for (const { table_name, column_name } of columns.rows) {
        const typeCheckQuery = `
          SELECT 
            CASE
              WHEN data ~ '^[0-9]+$' THEN 'integer'
              WHEN data ~ '^[0-9]+\.[0-9]+$' THEN 'decimal'
              ELSE 'text'
            END as type
          FROM (
            SELECT CAST(${column_name} AS TEXT) as data 
            FROM ${table_name} 
            WHERE ${column_name} IS NOT NULL 
            LIMIT 1
          ) t;
        `;
  
        const typeResult = await this.databaseService.getPool().query(typeCheckQuery);
        
        if (!output[table_name]) {
          output[table_name] = {};
        }
        
        output[table_name][column_name] = typeResult.rows[0]?.type || 'text';
      }
  
      return output;
    } catch (error) {
      console.error('Error fetching table column data types:', error);
      throw error;
    }
  }

  async getColumnData(tableName: string, columnName: string): Promise<any> {
    const query = `
      SELECT ${columnName} as value
      FROM ${tableName} 
      LIMIT 10;
    `;
   
    try {
      const result = await this.databaseService.getPool().query(query);
      return result.rows;
    } catch (error) {
      console.error('Error fetching column data:', error);
      throw error;
    }
   }
}
