const mongoose = require('mongoose');
require('dotenv').config();
const Faculty = require('../models/Faculty');

async function fixFacultyIndex() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/bloomnode', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('Connected to MongoDB');
    
    const db = mongoose.connection.db;
    const collectionName = Faculty.collection.name; // Get the actual collection name
    
    console.log(`Working with collection: ${collectionName}`);
    
    // Check if collection exists
    const collections = await db.listCollections({ name: collectionName }).toArray();
    
    if (collections.length === 0) {
      console.log(`ℹ️  Collection "${collectionName}" does not exist yet.`);
      console.log('   It will be created automatically when you create your first faculty.');
      console.log('   The compound index will be created automatically by the model definition.');
      console.log('\n✅ No action needed. The index will be set up correctly when the collection is created.');
      await mongoose.disconnect();
      process.exit(0);
    }
    
    const FacultyModel = Faculty.collection;
    
    // Get all indexes
    const indexes = await FacultyModel.indexes();
    console.log('\nCurrent indexes:');
    indexes.forEach(idx => {
      console.log(`  - ${idx.name}: ${JSON.stringify(idx.key)}`);
    });
    
    // Drop the old unique index on 'name' if it exists
    try {
      await FacultyModel.dropIndex('name_1');
      console.log('\n✅ Dropped old unique index on "name"');
    } catch (err) {
      if (err.code === 27 || err.codeName === 'IndexNotFound') {
        console.log('\nℹ️  Old index "name_1" does not exist (already removed or never existed)');
      } else {
        console.log(`\n⚠️  Could not drop index "name_1": ${err.message}`);
      }
    }
    
    // Ensure the compound index exists
    try {
      await FacultyModel.createIndex({ name: 1, campus: 1 }, { unique: true });
      console.log('✅ Created compound unique index on { name: 1, campus: 1 }');
    } catch (err) {
      if (err.code === 85 || err.codeName === 'IndexOptionsConflict') {
        console.log('ℹ️  Compound index already exists');
      } else {
        console.log(`⚠️  Could not create compound index: ${err.message}`);
      }
    }
    
    // Verify indexes
    const finalIndexes = await FacultyModel.indexes();
    console.log('\nFinal indexes:');
    finalIndexes.forEach(idx => {
      console.log(`  - ${idx.name}: ${JSON.stringify(idx.key)}`);
    });
    
    console.log('\n✅ Index migration completed!');
    console.log('You can now create faculties with the same name in different campuses.');
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.code === 26 || error.codeName === 'NamespaceNotFound') {
      console.log('\nℹ️  The collection does not exist yet.');
      console.log('   This is normal if you haven\'t created any faculties yet.');
      console.log('   The index will be created automatically when you create your first faculty.');
    }
    await mongoose.disconnect();
    process.exit(1);
  }
}

fixFacultyIndex();

