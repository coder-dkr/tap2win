const { Sequelize } = require('sequelize');
require('dotenv').config();

// Parse Supabase database URL manually to avoid pg-connection-string issues
const parseSupabaseUrl = (url) => {
  if (!url) return null;
  
  try {
    // Handle URLs that might be split across lines
    const cleanUrl = url.replace(/\s+/g, '');
    
    // Extract components from the URL
    const match = cleanUrl.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
    if (!match) {
      throw new Error('Invalid Supabase database URL format');
    }
    
    const [, username, password, host, port, database] = match;
    
    // URL decode the password (handle %40 for @ symbol)
    const decodedPassword = decodeURIComponent(password);
    
    return {
      username,
      password: decodedPassword,
      host,
      port: parseInt(port),
      database
    };
  } catch (error) {
    console.error('Error parsing Supabase URL:', error.message);
    return null;
  }
};

// Get database configuration
const dbConfig = parseSupabaseUrl(process.env.SUPABASE_DATABASE_URL);

if (!dbConfig) {
  console.error('❌ Invalid SUPABASE_DATABASE_URL configuration');
  console.error('Expected format: postgresql://postgres.your-project-ref:password@aws-0-region.pooler.supabase.com:5432/postgres');
  console.error('Note: If password contains @ symbol, encode it as %40');
  process.exit(1);
}

// Supabase connection configuration
const sequelize = new Sequelize(dbConfig.database, dbConfig.username, dbConfig.password, {
  host: dbConfig.host,
  port: dbConfig.port,
  dialect: 'postgres',
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  },
  logging: process.env.NODE_ENV === 'development' ? false : false,
  pool: {
    max: 10,
    min: 0,
    acquire: 60000,
    idle: 10000
  }
});

const connectDB = async () => {
  try {
    console.log('🔗 Connecting to Supabase database...');
    console.log(`   Host: ${dbConfig.host}`);
    console.log(`   Database: ${dbConfig.database}`);
    console.log(`   Username: ${dbConfig.username}`);
    
    await sequelize.authenticate();
    console.log('✅ Supabase database connected successfully');
    
    // Sync models in development
    if (process.env.NODE_ENV === 'development') {
      await sequelize.sync({ alter: true });
      console.log('✅ Database models synchronized with Supabase');
    }
  } catch (error) {
    console.error('❌ Supabase database connection failed:', error.message);
    console.error('Please check your SUPABASE_DATABASE_URL configuration');
    process.exit(1);
  }
};

module.exports = { sequelize, connectDB };