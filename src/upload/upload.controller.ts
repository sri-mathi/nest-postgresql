import { Controller, Post,Get,Query, UseInterceptors, UploadedFiles } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { UploadService } from './upload.service';

@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('csv')
  @UseInterceptors(FilesInterceptor('files'))
  async uploadCsv(@UploadedFiles() files: Express.Multer.File[]) {
    console.log('Received files:', files);
    await this.uploadService.processCsvFiles(files);
    return { message: 'CSV files processed successfully.' };
  }

  @Get('columns')
  async getTablesColumns(@Query('tableNames') tableNames: string) {
    if (!tableNames) {
      return { error: 'Table names are required' };
    }

    const tableArray = tableNames.split(',').map(name => name.trim());
    return this.uploadService.getColumnsForTables(tableArray);
  }

  @Get('table-column-datatypes')
  async getTableColumnDataTypes(@Query('tables') tables: string) {
    try {
      const selectedTables = tables.split(','); 
      const dataTypes = await this.uploadService.getTableColumnDataTypes(selectedTables);
      return dataTypes;
    } catch (error) {
      console.error('Error fetching table column data types:', error);
      return { message: 'Error retrieving table column data types' };
    }
  }

  @Get('column-data')
  async getColumnData(
    @Query('table') table: string,
    @Query('column') column: string
  ): Promise<any> {
    try {
      const data = await this.uploadService.getColumnData(table, column);
      return data; 
    } catch (error) {
      return { message: 'Error fetching column data', error: error.message };
    }
  }

}
