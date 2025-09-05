import { DataTypes, Model } from 'sequelize';
import sequelize from '../lib/database';
import User from './User';

export interface SessionAttributes {
  id?: number;
  userId: number;
  startTime: Date;
  endTime?: Date;
  creditsConsumed: number;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

class Session extends Model<SessionAttributes> implements SessionAttributes {
  public id!: number;
  public userId!: number;
  public startTime!: Date;
  public endTime?: Date;
  public creditsConsumed!: number;
  public isActive!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Session.init(
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
    startTime: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    endTime: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    creditsConsumed: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },
  {
    sequelize,
    modelName: 'Session',
    tableName: 'sessions',
    timestamps: true,
  }
);

// Define associations
Session.belongsTo(User, { foreignKey: 'userId', as: 'user' });
User.hasMany(Session, { foreignKey: 'userId', as: 'sessions' });

export default Session;
