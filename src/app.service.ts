import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class AppService {
  constructor(
    @InjectDataSource()
    private dataSource: DataSource,
  ) {}

  async getHello(): Promise<string> {
    try {
      const result = await this.dataSource.query('SELECT NOW()');
      return `Hello World! Database connected. Current time: ${result[0].now}`;
    } catch (error) {
      return `Error connecting to database: ${error.message}`;
    }
  }
}
