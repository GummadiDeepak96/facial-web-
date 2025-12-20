const mysql = require('mysql2');
const config = require('./config');

// Create connection pool
const pool = mysql.createPool(config.DB_CONFIG);

// Get promise-based pool
const promisePool = pool.promise();

// Test database connection
async function testConnection() {
	try {
		const connection = await promisePool.getConnection();
		console.log('✅ Database connected successfully');
		connection.release();
		return true;
	} catch (error) {
		console.error('❌ Database connection failed:', error.message);
		return false;
	}
}

// Database helper functions
const db = {
	// Execute query with parameters
	async query(sql, params = []) {
		try {
			const [rows] = await promisePool.execute(sql, params);
			return rows;
		} catch (error) {
			console.error('Database query error:', error);
			throw error;
		}
	},

	// Execute multiple queries in transaction
	async transaction(queries) {
		const connection = await promisePool.getConnection();
		try {
			await connection.beginTransaction();
      
			const results = [];
			for (const { sql, params } of queries) {
				const [result] = await connection.execute(sql, params);
				results.push(result);
			}
      
			await connection.commit();
			return results;
		} catch (error) {
			await connection.rollback();
			throw error;
		} finally {
			connection.release();
		}
	},

	// Get single record
	async findOne(table, conditions = {}, select = '*') {
		const whereClause = Object.keys(conditions).length > 0
			? 'WHERE ' + Object.keys(conditions).map(key => `${key} = ?`).join(' AND ')
			: '';

		const sql = `SELECT ${select} FROM ${table} ${whereClause} LIMIT 1`;
		const params = Object.values(conditions);

		try {
			const results = await this.query(sql, params);
			return results[0] || null;
		} catch (error) {
			// If caller attempted to query by a non-existent column, surface as "not found"
			if (error && error.code === 'ER_BAD_FIELD_ERROR') {
				console.warn(`findOne: missing column when querying ${table} - returning null`);
				return null;
			}
			throw error;
		}
	},

	// Get multiple records
	async findMany(table, conditions = {}, select = '*', orderBy = '', limit = '') {
		const whereClause = Object.keys(conditions).length > 0
			? 'WHERE ' + Object.keys(conditions).map(key => `${key} = ?`).join(' AND ')
			: '';

		const orderClause = orderBy ? `ORDER BY ${orderBy}` : '';
		const limitClause = limit ? `LIMIT ${limit}` : '';

		const sql = `SELECT ${select} FROM ${table} ${whereClause} ${orderClause} ${limitClause}`;
		const params = Object.values(conditions);

		try {
			return await this.query(sql, params);
		} catch (error) {
			if (error && error.code === 'ER_BAD_FIELD_ERROR') {
				console.warn(`findMany: attempted to query ${table} by missing column(s) - returning empty array`);
				return [];
			}
			throw error;
		}
	},

	// Insert record
	async insert(table, data) {
		const columns = Object.keys(data).join(', ');
		const placeholders = Object.keys(data).map(() => '?').join(', ');
		const values = Object.values(data);
    
		const sql = `INSERT INTO ${table} (${columns}) VALUES (${placeholders})`;
		const result = await this.query(sql, values);
		return result;
	},

	// Update record
	async update(table, data, conditions) {
		const setClause = Object.keys(data).map(key => `${key} = ?`).join(', ');
		const whereClause = Object.keys(conditions).map(key => `${key} = ?`).join(' AND ');
    
		const sql = `UPDATE ${table} SET ${setClause} WHERE ${whereClause}`;
		const params = [...Object.values(data), ...Object.values(conditions)];
    
		return await this.query(sql, params);
	},

	// Delete record
	async delete(table, conditions) {
		const whereClause = Object.keys(conditions).map(key => `${key} = ?`).join(' AND ');
		const sql = `DELETE FROM ${table} WHERE ${whereClause}`;
		const params = Object.values(conditions);
    
		return await this.query(sql, params);
	}
};

module.exports = { db, testConnection };
