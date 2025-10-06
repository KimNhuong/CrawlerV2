import { DataTypes } from "sequelize";
import db from "../config/Database.js";

const Page = db.define("Page", {
  url: { type: DataTypes.STRING, allowNull: false },
  title: { type: DataTypes.STRING },
  subtitle: { type: DataTypes.STRING },
  content: { type: DataTypes.TEXT("long") },
  author: { type: DataTypes.STRING },
  timestamp: { type: DataTypes.DATE }   
});

export default Page;
