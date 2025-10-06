import { Sequelize } from "sequelize";

const db = new Sequelize("CrawlerV2", "root", "841639647172n", {
  host: "localhost",
  dialect: "mysql", 
  logging: false,
});

export default db;
