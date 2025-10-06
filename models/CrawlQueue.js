// models/CrawlQueue.js
import { DataTypes } from "sequelize";
import db from "../config/Database.js";

const CrawlQueue = db.define("CrawlQueue", {
  id: {
    type: DataTypes.BIGINT.UNSIGNED,
    autoIncrement: true,
    primaryKey: true,
  },
  url: {
    type: DataTypes.STRING(512),
    allowNull: false,
    unique: true, // 👈 thêm để tránh duplicate URL
  },
  domain: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  depth: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  status: {
    type: DataTypes.ENUM("queued", "processing", "done", "failed"),
    defaultValue: "queued",
  },

  // Crawl meta
  lastCrawled: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  nextCrawlAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  recrawlInterval: {
    type: DataTypes.INTEGER, // seconds
    defaultValue: 3600,      // 1h
  },

  // Adaptive signals
  changeRate: {
    type: DataTypes.FLOAT,
    defaultValue: 0,
  },
  failCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  score: {
    type: DataTypes.FLOAT,
    defaultValue: 0,
  },
  contentHash: {
    type: DataTypes.STRING(64),
    allowNull: true,
  },

  // 🆕 bổ sung
  visits: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  changes: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  priority: {
    type: DataTypes.FLOAT,
    defaultValue: 0,
  },
}, {
  tableName: "CrawlQueue",
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ["url"], // 👈 tạo index unique cho url
    }
  ]
});

export default CrawlQueue;
