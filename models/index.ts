import sequelize from '../lib/database';
import User from './User';
import Session from './Session';
import CreditLog from './CreditLog';

// Initialize database connection and sync models
export const initDatabase = async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connection has been established successfully.');
    
    // Sync all models
    await sequelize.sync({ force: false });
    console.log('All models were synchronized successfully.');
  } catch (error) {
    console.error('Unable to connect to the database:', error);
    throw error;
  }
};

export { User, Session, CreditLog, sequelize };
