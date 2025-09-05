import { DataTypes, Model } from 'sequelize';
import sequelize from '../lib/database';
import User from './User';
import Session from './Session';

export interface CreditLogAttributes {
  id?: number;
  userId: number;
  sessionId?: number;
  creditsDeducted: number;
  remainingCredits: number;
  timestamp: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

class CreditLog extends Model<CreditLogAttributes> implements CreditLogAttributes {
  public id!: number;
  public userId!: number;
  public sessionId?: number;
  public creditsDeducted!: number;
  public remainingCredits!: number;
  public timestamp!: Date;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

CreditLog.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: User,
        key: 'id',
      },
    },
    sessionId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: Session,
        key: 'id',
      },
    },
    creditsDeducted: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    remainingCredits: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    timestamp: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    modelName: 'CreditLog',
    tableName: 'credit_logs',
    timestamps: true,
  }
);

// Define associations
CreditLog.belongsTo(User, { foreignKey: 'userId', as: 'user' });
CreditLog.belongsTo(Session, { foreignKey: 'sessionId', as: 'session' });
User.hasMany(CreditLog, { foreignKey: 'userId', as: 'creditLogs' });
Session.hasMany(CreditLog, { foreignKey: 'sessionId', as: 'creditLogs' });

export default CreditLog;
