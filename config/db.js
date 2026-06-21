const mongoose = require('mongoose');

async function dropLegacyMineralNameIndex() {
  try {
    const Mineral = require('../models/Mineral');
    await Mineral.collection.dropIndex('name_1');
    console.log('[db] Dropped legacy unique index on minerals.name');
  } catch (err) {
    if (err?.codeName !== 'IndexNotFound' && err?.code !== 27) {
      console.warn('[db] Could not drop minerals.name index:', err.message);
    }
  }
}

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
       useNewUrlParser: true,
       useUnifiedTopology: true, 
       dbName: 'Denton'
    });
    await dropLegacyMineralNameIndex();
  } catch (error) {
    process.exit(1);
  }
};

module.exports = connectDB;
